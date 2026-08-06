
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';
import {
  getOrCreateLifecycleId,
  makeLogger,
  correlationHeaders,
} from '../_shared/logger.ts';

const FN = 'approve-payment';

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
    kind: z.enum(['subscription', 'message_fee', 'wallet_topup']).optional(),
    subscriptionTier: z.enum(['individual', 'small-business', 'organization']).optional(),
    frequency: z.enum(['monthly', 'annual']).optional(),
    duration: z.number().int().positive().max(365).optional(),
    conversationId: z.string().uuid().optional(),
    businessId: z.number().int().positive().optional(),
    feePi: z.number().positive().max(100).optional(),
  }).strict()
});

// Subscription tier assignment is intentionally NOT performed here.
// See `complete-payment` — tier upgrades only occur after the on-chain
// payment is verified completed, to prevent free subscription grants via
// approval-only calls with forged amount/metadata.


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

  const lifecycleId = getOrCreateLifecycleId(req);
  const log = makeLogger({ fn: FN, lifecycleId });
  const startTime = Date.now();

  const respond = (body: Record<string, unknown>, status = 200) =>
    new Response(JSON.stringify({ ...body, lifecycleId, correlationId: lifecycleId }), {
      headers: {
        ...corsHeaders,
        ...correlationHeaders(lifecycleId),
        'Content-Type': 'application/json',
      },
      status,
    });

  log.info(`${FN}.request.received`, { stage: 'validation' });

  try {
    // ✅ SECURITY: Require & verify caller JWT
    const authHeader = req.headers.get('authorization') || req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return respond({ success: false, message: 'Unauthorized' }, 401);
    }
    const callerToken = authHeader.replace('Bearer ', '');
    const { data: authData, error: authError } = await supabaseClient.auth.getUser(callerToken);
    if (authError || !authData?.user) {
      return respond({ success: false, message: 'Unauthorized' }, 401);
    }
    const authenticatedUserId = authData.user.id;

    const rawBody = await req.json();
    const validationResult = PaymentRequestSchema.safeParse(rawBody);

    if (!validationResult.success) {
      const errors = validationResult.error.errors.map(e => ({
        field: e.path.join('.'),
        message: e.message,
      }));
      log.warn(`${FN}.validation.failed`, { stage: 'validation', errors });
      return respond({ success: false, message: 'Invalid request data', errors }, 400);
    }

    const paymentRequest = validationResult.data;

    // ✅ SECURITY: Caller must match userId in body
    if (paymentRequest.userId !== authenticatedUserId) {
      log.error(`${FN}.auth.user_mismatch`, { stage: 'validation', authenticatedUserId });
      return respond({ success: false, message: 'Forbidden: user mismatch' }, 403);
    }

    log.extend({ paymentId: paymentRequest.paymentId, userId: paymentRequest.userId });
    log.info(`${FN}.validation.ok`, { stage: 'validation', amount: paymentRequest.amount });

    const piApiKey = Deno.env.get('PI_API_KEY');
    if (!piApiKey) {
      log.error(`${FN}.config.missing_api_key`, { stage: 'error' });
      return respond({ success: false, message: 'Payment service not configured' }, 500);
    }

    const { data: existingPayment, error: checkError } = await supabaseClient
      .from('payments')
      .select('*')
      .eq('payment_id', paymentRequest.paymentId)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      log.error(`${FN}.lookup.error`, {
        stage: 'lookup',
        code: checkError.code,
        message: checkError.message,
      });
      return respond({ success: false, message: 'Payment processing failed. Please try again.' }, 500);
    }

    log.info(`${FN}.lookup.ok`, {
      stage: 'lookup',
      exists: !!existingPayment,
      currentStatus: existingPayment?.status ?? null,
    });

    if (existingPayment && existingPayment.user_id !== paymentRequest.userId) {
      log.error(`${FN}.lookup.ownership_mismatch`, {
        stage: 'lookup',
        ownerOnRecord: existingPayment.user_id,
      });
      return respond({ success: false, message: 'Payment ownership mismatch' }, 403);
    }

    if (existingPayment?.status?.completed) {
      log.info(`${FN}.terminal.idempotent`, { stage: 'transition', terminalReason: 'completed' });
      return respond({
        success: true,
        message: 'Payment already completed',
        paymentId: paymentRequest.paymentId,
        txid: existingPayment.txid,
      });
    }
    if (existingPayment?.status?.cancelled && !isStalePayment(existingPayment)) {
      log.info(`${FN}.terminal.idempotent`, { stage: 'transition', terminalReason: 'cancelled' });
      return respond({
        success: false,
        message: 'Payment was cancelled',
        paymentId: paymentRequest.paymentId,
      }, 409);
    }

    if (existingPayment && isStalePayment(existingPayment)) {
      log.warn(`${FN}.stale.detected`, { stage: 'lookup' });
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

        log.transition(existingPayment.status, { cancelled: true }, {
          terminalReason: 'cancelled',
          reason: 'stale',
        });
      } catch (cancelError) {
        log.error(`${FN}.stale.cancel_error`, {
          stage: 'error',
          message: cancelError instanceof Error ? cancelError.message : String(cancelError),
        });
      }
    }

    if (existingPayment?.status?.approved && !isStalePayment(existingPayment)) {
      log.info(`${FN}.terminal.idempotent`, { stage: 'transition', terminalReason: null, note: 'already_approved' });
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
          lifecycle_id: lifecycleId,
          status: {
            approved: false,
            verified: false,
            completed: false,
            cancelled: false,
          },
        });
      if (error && error.code !== '23505') {
        log.error(`${FN}.db_write.insert_error`, {
          stage: 'db_write',
          code: error.code,
          message: error.message,
        });
        return respond({ success: false, message: 'Payment processing failed. Please try again.' }, 500);
      }
      log.transition('none', 'pending', { idempotent: error?.code === '23505' });
    }

    log.info(`${FN}.pi_api.call`, { stage: 'pi_api' });
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
      log.info(`${FN}.pi_api.response`, {
        stage: 'pi_api',
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

          log.transition('pending', 'approved', { source: 'pi_already_approved' });
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

        log.error(`${FN}.pi_api.error`, { stage: 'pi_api', result: approveResult });
        log.transition('pending', 'cancelled', { terminalReason: 'error', source: 'pi_api_error' });
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
      log.transition('pending', 'approved');

      // SECURITY: Do NOT grant subscription tiers on approval.
      // Approval only signals intent — the on-chain Pi transfer has not
      // been completed or verified yet. Subscription changes are applied
      // exclusively in `complete-payment` after the payment is confirmed
      // completed and the amount is validated server-side.


      log.info(`${FN}.done`, { stage: 'done', durationMs: Date.now() - startTime });
      return respond({
        success: true,
        message: 'Payment approved successfully',
        paymentId: paymentRequest.paymentId,
      });
    } catch (apiError) {
      log.error(`${FN}.pi_api.exception`, {
        stage: 'pi_api',
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
      log.transition('pending', 'cancelled', { terminalReason: 'error', source: 'pi_api_exception' });

      return respond({ success: false, message: 'Payment service temporarily unavailable. Please try again.' }, 502);
    }
  } catch (error) {
    log.error(`${FN}.unhandled`, {
      stage: 'error',
      message: error instanceof Error ? error.message : String(error),
    });
    return respond({ success: false, message: 'Payment service error. Please try again later.' }, 500);
  }
});
