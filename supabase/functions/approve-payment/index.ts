
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';
import {
  getOrCreateCorrelationId,
  makeLogger,
  correlationHeaders,
} from '../_shared/logger.ts';

// Validation schema for payment requests with strict input validation
const PaymentRequestSchema = z.object({
  paymentId: z.string()
    .min(1, 'Payment ID is required')
    .max(100, 'Payment ID too long')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Invalid payment ID format'),
  userId: z.string().uuid('Invalid user ID format'),
  amount: z.number().positive('Amount must be positive').max(1000000, 'Amount exceeds maximum'),
  memo: z.string().max(500, 'Memo too long').transform(val =>
    val.replace(/[<>]/g, '')
  ).optional(),
  metadata: z.object({
    subscriptionTier: z.enum(['individual', 'small-business', 'organization']).optional(),
    frequency: z.enum(['monthly', 'annual']).optional(),
    duration: z.number().int().positive().max(365).optional()
  }).strict()
});

function determineSubscriptionTier(amount: number, metadata: Record<string, any>): string {
  if (metadata?.subscriptionTier) return metadata.subscriptionTier;
  if (amount < 1) return 'individual';
  if (amount < 10) return 'small-business';
  return 'organization';
}

function isStalePayment(payment: any): boolean {
  const createdAt = new Date(payment.created_at).getTime();
  const now = Date.now();
  const tenMinutesInMs = 10 * 60 * 1000;
  return (
    !payment.status.completed &&
    !payment.status.cancelled &&
    (now - createdAt) > tenMinutesInMs
  );
}

const supabaseClient = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
);

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const correlationId = getOrCreateCorrelationId(req);
  const log = makeLogger({ fn: 'approve-payment', correlationId });
  const startTime = Date.now();

  const respond = (body: Record<string, unknown>, status = 200) =>
    new Response(JSON.stringify({ ...body, correlationId }), {
      headers: {
        ...corsHeaders,
        ...correlationHeaders(correlationId),
        'Content-Type': 'application/json',
      },
      status,
    });

  log.info('approve.start');

  try {
    const rawBody = await req.json();
    const validationResult = PaymentRequestSchema.safeParse(rawBody);

    if (!validationResult.success) {
      log.warn('approve.validation_failed', {
        errors: validationResult.error.errors.map(e => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      });
      return respond({
        success: false,
        message: 'Invalid request data',
        errors: validationResult.error.errors.map(e => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      }, 400);
    }

    const paymentRequest = validationResult.data;
    log.extend({ paymentId: paymentRequest.paymentId, userId: paymentRequest.userId });
    log.info('approve.request_validated', { amount: paymentRequest.amount });

    const piApiKey = Deno.env.get('PI_API_KEY');
    if (!piApiKey) {
      log.error('approve.pi_api_key_missing');
      return respond({ success: false, message: 'Payment service not configured' }, 500);
    }

    const { data: existingPayment, error: checkError } = await supabaseClient
      .from('payments')
      .select('*')
      .eq('payment_id', paymentRequest.paymentId)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      log.error('approve.db_check_error', { code: checkError.code, message: checkError.message });
      return respond({ success: false, message: 'Payment processing failed. Please try again.' }, 500);
    }

    log.info('approve.existing_lookup', {
      exists: !!existingPayment,
      currentStatus: existingPayment?.status ?? null,
    });

    if (existingPayment && existingPayment.user_id !== paymentRequest.userId) {
      log.error('approve.ownership_mismatch', {
        ownerOnRecord: existingPayment.user_id,
      });
      return respond({ success: false, message: 'Payment ownership mismatch' }, 403);
    }

    if (existingPayment?.status?.completed) {
      log.info('approve.terminal.already_completed');
      return respond({
        success: true,
        message: 'Payment already completed',
        paymentId: paymentRequest.paymentId,
        txid: existingPayment.txid,
      });
    }
    if (existingPayment?.status?.cancelled && !isStalePayment(existingPayment)) {
      log.info('approve.terminal.already_cancelled');
      return respond({
        success: false,
        message: 'Payment was cancelled',
        paymentId: paymentRequest.paymentId,
      }, 409);
    }

    if (existingPayment && isStalePayment(existingPayment)) {
      log.warn('approve.stale_detected');
      try {
        const piNetworkApiUrl = 'https://api.minepi.com/v2/payments';
        await fetch(`${piNetworkApiUrl}/${paymentRequest.paymentId}/cancel`, {
          method: 'POST',
          headers: {
            'Authorization': `Key ${piApiKey}`,
            'Content-Type': 'application/json',
          },
        });

        await supabaseClient.from('payments').update({
          status: {
            approved: false,
            verified: false,
            completed: false,
            cancelled: true,
            error: 'Payment automatically cancelled due to staleness (>10 minutes old)',
          },
          updated_at: new Date().toISOString(),
        }).eq('payment_id', paymentRequest.paymentId);

        log.info('approve.transition', {
          from: existingPayment.status,
          to: 'cancelled_stale',
        });
      } catch (cancelError) {
        log.error('approve.stale_cancel_error', {
          message: cancelError instanceof Error ? cancelError.message : String(cancelError),
        });
      }
    }

    if (existingPayment?.status?.approved && !isStalePayment(existingPayment)) {
      log.info('approve.terminal.already_approved');
      return respond({
        success: true,
        message: 'Payment was already approved',
        paymentId: paymentRequest.paymentId,
      });
    }

    if (!existingPayment) {
      const { error } = await supabaseClient
        .from('payments')
        .insert({
          payment_id: paymentRequest.paymentId,
          user_id: paymentRequest.userId,
          amount: paymentRequest.amount,
          memo: paymentRequest.memo,
          metadata: paymentRequest.metadata,
          status: {
            approved: false,
            verified: false,
            completed: false,
            cancelled: false,
          },
        });
      if (error && error.code !== '23505') {
        log.error('approve.insert_error', { code: error.code, message: error.message });
        return respond({ success: false, message: 'Payment processing failed. Please try again.' }, 500);
      }
      log.info('approve.transition', {
        from: 'none',
        to: 'created',
        idempotent: error?.code === '23505',
      });
    }

    log.info('approve.pi_api.call');
    try {
      const piNetworkApiUrl = 'https://api.minepi.com/v2/payments';
      const approveResponse = await fetch(`${piNetworkApiUrl}/${paymentRequest.paymentId}/approve`, {
        method: 'POST',
        headers: {
          'Authorization': `Key ${piApiKey}`,
          'Content-Type': 'application/json',
        },
      });

      const approveResult = await approveResponse.json();
      log.info('approve.pi_api.response', {
        ok: approveResponse.ok,
        status: approveResponse.status,
      });

      if (!approveResponse.ok) {
        if (approveResult.message?.includes('already approved')) {
          await supabaseClient.from('payments').update({
            status: {
              approved: true,
              verified: false,
              completed: false,
              cancelled: false,
            },
            updated_at: new Date().toISOString(),
          }).eq('payment_id', paymentRequest.paymentId);

          log.info('approve.transition', { from: 'pending', to: 'approved', source: 'pi_already_approved' });
          return respond({
            success: true,
            message: 'Payment was already approved',
            paymentId: paymentRequest.paymentId,
          });
        }

        await supabaseClient.from('payments').update({
          status: {
            approved: false,
            verified: false,
            completed: false,
            cancelled: true,
            error: `Pi Network API error: ${JSON.stringify(approveResult)}`,
          },
          updated_at: new Date().toISOString(),
        }).eq('payment_id', paymentRequest.paymentId);

        log.error('approve.pi_api.error', { result: approveResult });
        log.info('approve.transition', { from: 'pending', to: 'cancelled_error' });
        return respond({ success: false, message: 'Payment approval failed. Please try again.' }, 502);
      }

      await supabaseClient.from('payments').update({
        status: {
          approved: true,
          verified: false,
          completed: false,
          cancelled: false,
        },
        updated_at: new Date().toISOString(),
      }).eq('payment_id', paymentRequest.paymentId);
      log.info('approve.transition', { from: 'pending', to: 'approved' });

      const subscriptionTier = determineSubscriptionTier(paymentRequest.amount, paymentRequest.metadata);
      const duration = Number(paymentRequest.metadata?.duration) || null;
      const now = new Date();
      const endDate = duration ? new Date(now.getTime() + duration * 86400000) : null;

      const { data: userData } = await supabaseClient
        .from('users')
        .select('id, subscription')
        .eq('id', paymentRequest.userId)
        .maybeSingle();

      if (userData) {
        const shouldUpdate = !userData.subscription ||
          (subscriptionTier === 'organization') ||
          (subscriptionTier === 'small-business' && userData.subscription === 'individual');

        if (shouldUpdate) {
          const { error: updateError } = await supabaseClient
            .from('users')
            .update({ subscription: subscriptionTier })
            .eq('id', paymentRequest.userId);

          if (!updateError) {
            const { error: subError } = await supabaseClient
              .from('subscriptions')
              .insert({
                user_id: paymentRequest.userId,
                plan: subscriptionTier,
                duration,
                start_date: now.toISOString(),
                end_date: endDate?.toISOString() || null,
              });
            if (subError) log.warn('approve.subscription_history_error', { message: subError.message });
          } else {
            log.warn('approve.user_update_error', { message: updateError.message });
          }
        } else {
          log.info('approve.subscription_unchanged');
        }
      } else {
        log.warn('approve.user_not_found');
      }

      log.info('approve.complete', { durationMs: Date.now() - startTime });
      return respond({
        success: true,
        message: 'Payment approved successfully',
        paymentId: paymentRequest.paymentId,
      });
    } catch (apiError) {
      log.error('approve.pi_api.exception', {
        message: apiError instanceof Error ? apiError.message : String(apiError),
      });
      await supabaseClient.from('payments').update({
        status: {
          approved: false,
          verified: false,
          completed: false,
          cancelled: true,
          error: `API call error: ${apiError instanceof Error ? apiError.message : String(apiError)}`,
        },
        updated_at: new Date().toISOString(),
      }).eq('payment_id', paymentRequest.paymentId);
      log.info('approve.transition', { from: 'pending', to: 'cancelled_api_error' });

      return respond({ success: false, message: 'Payment service temporarily unavailable. Please try again.' }, 502);
    }
  } catch (error) {
    log.error('approve.unhandled', {
      message: error instanceof Error ? error.message : String(error),
    });
    return respond({ success: false, message: 'Payment service error. Please try again later.' }, 500);
  }
});
