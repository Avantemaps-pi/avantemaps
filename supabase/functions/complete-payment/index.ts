import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';
import { createPaymentNotification } from '../_shared/notifications.ts';
import {
  getOrCreateCorrelationId,
  makeLogger,
  correlationHeaders,
} from '../_shared/logger.ts';

const PaymentRequestSchema = z.object({
  paymentId: z.string()
    .min(1, 'Payment ID is required')
    .max(100, 'Payment ID too long')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Invalid payment ID format'),
  txid: z.string()
    .min(1, 'Transaction ID is required')
    .max(128, 'Transaction ID too long')
    .regex(/^[a-fA-F0-9]+$/, 'Invalid transaction ID format'),
  userId: z.string().uuid('Invalid user ID format'),
  amount: z.number().positive('Amount must be positive').max(1000000, 'Amount exceeds maximum'),
  memo: z.string().max(500, 'Memo too long').transform(val =>
    val.replace(/[<>]/g, '')
  ).optional(),
  metadata: z.object({
    subscriptionTier: z.enum(['individual', 'small-business', 'organization']).optional(),
    frequency: z.enum(['monthly', 'annual']).optional(),
    duration: z.number().int().positive().max(365).optional(),
  }).strict(),
});

const supabaseClient = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
);

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const correlationId = getOrCreateCorrelationId(req);
  const log = makeLogger({ fn: 'complete-payment', correlationId });
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

  log.info('complete.start');

  try {
    const rawBody = await req.json();
    const validationResult = PaymentRequestSchema.safeParse(rawBody);

    if (!validationResult.success) {
      log.warn('complete.validation_failed', {
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
    log.extend({
      paymentId: paymentRequest.paymentId,
      userId: paymentRequest.userId,
      txid: paymentRequest.txid,
    });
    log.info('complete.request_validated', { amount: paymentRequest.amount });

    const piApiKey = Deno.env.get('PI_API_KEY');
    if (!piApiKey) {
      log.error('complete.pi_api_key_missing');
      return respond({ success: false, message: 'Payment service not configured' }, 500);
    }

    const { data: existingPayment, error: lookupError } = await supabaseClient
      .from('payments')
      .select('user_id, txid, status')
      .eq('payment_id', paymentRequest.paymentId)
      .maybeSingle();

    if (lookupError) {
      log.error('complete.db_lookup_error', { code: lookupError.code, message: lookupError.message });
      return respond({ success: false, message: 'Payment processing failed. Please try again.' }, 500);
    }

    log.info('complete.existing_lookup', {
      exists: !!existingPayment,
      currentStatus: existingPayment?.status ?? null,
    });

    if (existingPayment && existingPayment.user_id !== paymentRequest.userId) {
      log.error('complete.ownership_mismatch', { ownerOnRecord: existingPayment.user_id });
      return respond({ success: false, message: 'Payment ownership mismatch' }, 403);
    }

    if (existingPayment?.status?.completed) {
      if (existingPayment.txid && existingPayment.txid !== paymentRequest.txid) {
        log.error('complete.txid_mismatch', { recorded: existingPayment.txid });
        return respond({ success: false, message: 'Transaction ID mismatch on completed payment' }, 409);
      }
      log.info('complete.terminal.already_completed');
      return respond({
        success: true,
        message: 'Payment was already completed',
        paymentId: paymentRequest.paymentId,
        txid: existingPayment.txid ?? paymentRequest.txid,
      });
    }

    if (existingPayment?.status?.cancelled) {
      log.warn('complete.refused_cancelled');
      return respond({
        success: false,
        message: 'Payment was cancelled and cannot be completed',
      }, 409);
    }

    log.info('complete.pi_api.call');
    try {
      const piNetworkApiUrl = 'https://api.minepi.com/v2/payments';
      const completeResponse = await fetch(`${piNetworkApiUrl}/${paymentRequest.paymentId}/complete`, {
        method: 'POST',
        headers: {
          'Authorization': `Key ${piApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ txid: paymentRequest.txid }),
      });

      const completeResult = await completeResponse.json();
      log.info('complete.pi_api.response', {
        ok: completeResponse.ok,
        status: completeResponse.status,
      });

      if (!completeResponse.ok) {
        if (completeResult.message?.includes('already completed')) {
          await supabaseClient.from('payments').update({
            status: {
              approved: true,
              verified: true,
              completed: true,
              cancelled: false,
            },
            txid: paymentRequest.txid,
            updated_at: new Date().toISOString(),
          }).eq('payment_id', paymentRequest.paymentId);

          log.info('complete.transition', {
            from: existingPayment?.status ?? null,
            to: 'completed',
            source: 'pi_already_completed',
          });
          return respond({
            success: true,
            message: 'Payment was already completed',
            paymentId: paymentRequest.paymentId,
            txid: paymentRequest.txid,
          });
        }

        await supabaseClient.from('payments').update({
          status: {
            approved: true,
            verified: false,
            completed: false,
            cancelled: true,
            error: `Pi Network completion API error: ${JSON.stringify(completeResult)}`,
          },
          updated_at: new Date().toISOString(),
        }).eq('payment_id', paymentRequest.paymentId);

        log.error('complete.pi_api.error', { result: completeResult });
        log.info('complete.transition', {
          from: existingPayment?.status ?? null,
          to: 'cancelled_error',
        });
        return respond({
          success: false,
          message: 'Payment completion failed. Please try again.',
        }, 502);
      }

      await supabaseClient.from('payments').update({
        status: {
          approved: true,
          verified: true,
          completed: true,
          cancelled: false,
        },
        txid: paymentRequest.txid,
        updated_at: new Date().toISOString(),
      }).eq('payment_id', paymentRequest.paymentId);

      log.info('complete.transition', {
        from: existingPayment?.status ?? 'approved',
        to: 'completed',
      });

      if (paymentRequest.metadata?.subscriptionTier) {
        try {
          const metadata = paymentRequest.metadata as any;
          const username = metadata?.username || `user_${paymentRequest.userId.slice(0, 8)}`;
          const email = metadata?.email || `${username}@pi.app`;

          const { error: subscriptionError } = await supabaseClient.rpc('handle_subscription_after_payment', {
            p_user_id: paymentRequest.userId,
            p_username: username,
            p_email: email,
            p_subscription_tier: paymentRequest.metadata.subscriptionTier,
          });

          if (subscriptionError) {
            log.warn('complete.subscription_rpc_error', { message: subscriptionError.message });
          } else {
            log.info('complete.subscription_created', { tier: paymentRequest.metadata.subscriptionTier });
          }
        } catch (subscriptionErr) {
          log.error('complete.subscription_exception', {
            message: subscriptionErr instanceof Error ? subscriptionErr.message : String(subscriptionErr),
          });
        }
      }

      try {
        await createPaymentNotification(
          supabaseClient,
          paymentRequest.userId,
          paymentRequest.amount,
          paymentRequest.metadata?.subscriptionTier
        );
        log.info('complete.notification_created');
      } catch (notifError) {
        log.warn('complete.notification_error', {
          message: notifError instanceof Error ? notifError.message : String(notifError),
        });
      }

      log.info('complete.done', { durationMs: Date.now() - startTime });
      return respond({
        success: true,
        message: 'Payment completed successfully',
        paymentId: paymentRequest.paymentId,
        txid: paymentRequest.txid,
        subscriptionCreated: !!paymentRequest.metadata?.subscriptionTier,
      });
    } catch (apiError) {
      log.error('complete.pi_api.exception', {
        message: apiError instanceof Error ? apiError.message : String(apiError),
      });

      await supabaseClient.from('payments').update({
        status: {
          approved: true,
          verified: false,
          completed: false,
          cancelled: true,
          error: `API call error: ${apiError instanceof Error ? apiError.message : String(apiError)}`,
        },
        updated_at: new Date().toISOString(),
      }).eq('payment_id', paymentRequest.paymentId);

      log.info('complete.transition', {
        from: existingPayment?.status ?? null,
        to: 'cancelled_api_error',
      });

      return respond({
        success: false,
        message: 'Payment completion temporarily unavailable',
        paymentId: paymentRequest.paymentId,
        txid: paymentRequest.txid,
      }, 502);
    }
  } catch (error) {
    log.error('complete.unhandled', {
      message: error instanceof Error ? error.message : String(error),
    });
    return respond({ success: false, message: 'Payment completion service temporarily unavailable' }, 500);
  }
});
