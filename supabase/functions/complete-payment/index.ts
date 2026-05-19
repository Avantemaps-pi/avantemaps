import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';
import { createPaymentNotification } from '../_shared/notifications.ts';
import {
  getOrCreateLifecycleId,
  makeLogger,
  correlationHeaders,
} from '../_shared/logger.ts';

const FN = 'complete-payment';

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
    kind: z.enum(['subscription', 'message_fee']).optional(),
    subscriptionTier: z.enum(['individual', 'small-business', 'organization']).optional(),
    frequency: z.enum(['monthly', 'annual']).optional(),
    duration: z.number().int().positive().max(365).optional(),
    conversationId: z.string().uuid().optional(),
    businessId: z.number().int().positive().optional(),
    feePi: z.number().positive().max(100).optional(),
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
    log.extend({
      paymentId: paymentRequest.paymentId,
      userId: paymentRequest.userId,
      txid: paymentRequest.txid,
    });
    log.info(`${FN}.validation.ok`, { stage: 'validation', amount: paymentRequest.amount });

    const piApiKey = Deno.env.get('PI_API_KEY');
    if (!piApiKey) {
      log.error(`${FN}.config.missing_api_key`, { stage: 'error' });
      return respond({ success: false, message: 'Payment service not configured' }, 500);
    }

    const { data: existingPayment, error: lookupError } = await supabaseClient
      .from('payments')
      .select('user_id, txid, status')
      .eq('payment_id', paymentRequest.paymentId)
      .maybeSingle();

    if (lookupError) {
      log.error(`${FN}.lookup.error`, {
        stage: 'lookup',
        code: lookupError.code,
        message: lookupError.message,
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
      if (existingPayment.txid && existingPayment.txid !== paymentRequest.txid) {
        log.error(`${FN}.lookup.txid_mismatch`, {
          stage: 'lookup',
          recorded: existingPayment.txid,
        });
        return respond({
          success: false,
          message: 'Transaction ID mismatch on completed payment',
        }, 409);
      }
      log.info(`${FN}.terminal.idempotent`, { stage: 'transition', terminalReason: 'completed' });
      return respond({
        success: true,
        message: 'Payment was already completed',
        paymentId: paymentRequest.paymentId,
        txid: existingPayment.txid ?? paymentRequest.txid,
      });
    }

    if (existingPayment?.status?.cancelled) {
      log.warn(`${FN}.terminal.refused`, {
        stage: 'transition',
        terminalReason: 'cancelled',
      });
      return respond({
        success: false,
        message: 'Payment was cancelled and cannot be completed',
      }, 409);
    }

    log.info(`${FN}.pi_api.call`, { stage: 'pi_api' });
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
      log.info(`${FN}.pi_api.response`, {
        stage: 'pi_api',
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
            lifecycle_id: lifecycleId,
            updated_at: new Date().toISOString(),
          }).eq('payment_id', paymentRequest.paymentId);

          log.transition(existingPayment?.status ?? null, 'completed', {
            terminalReason: 'completed',
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
          lifecycle_id: lifecycleId,
          updated_at: new Date().toISOString(),
        }).eq('payment_id', paymentRequest.paymentId);

        log.error(`${FN}.pi_api.error`, { stage: 'pi_api', result: completeResult });
        log.transition(existingPayment?.status ?? null, 'cancelled', {
          terminalReason: 'error',
          source: 'pi_api_error',
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
        lifecycle_id: lifecycleId,
        updated_at: new Date().toISOString(),
      }).eq('payment_id', paymentRequest.paymentId);

      log.transition(existingPayment?.status ?? 'approved', 'completed', {
        terminalReason: 'completed',
      });

      if (paymentRequest.metadata?.kind === 'message_fee') {
        try {
          const md = paymentRequest.metadata as any;
          let feeUsd = 0;
          try {
            const { data: priceRow } = await supabaseClient
              .from('pi_price').select('price_usd').limit(1).maybeSingle();
            feeUsd = Number(priceRow?.price_usd ?? 0) * Number(md.feePi ?? paymentRequest.amount);
          } catch (_) { /* non-fatal */ }
          const { error: feeError } = await supabaseClient
            .from('message_fees')
            .insert({
              conversation_id: md.conversationId,
              sender_id: paymentRequest.userId,
              business_id: md.businessId,
              fee_pi: md.feePi ?? paymentRequest.amount,
              fee_usd: feeUsd,
              payment_id: paymentRequest.paymentId,
              platform_share_pi: md.feePi ?? paymentRequest.amount,
              business_share_pi: 0,
              status: 'paid',
            });
          if (feeError) {
            log.warn(`${FN}.message_fee.insert_error`, {
              stage: 'db_write', message: feeError.message,
            });
          } else {
            log.info(`${FN}.message_fee.recorded`, {
              stage: 'db_write', conversationId: md.conversationId,
            });
          }
        } catch (feeErr) {
          log.error(`${FN}.message_fee.exception`, {
            stage: 'error',
            message: feeErr instanceof Error ? feeErr.message : String(feeErr),
          });
        }
      }


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
            log.warn(`${FN}.db_write.subscription_rpc_error`, {
              stage: 'db_write',
              message: subscriptionError.message,
            });
          } else {
            log.info(`${FN}.subscription.created`, {
              stage: 'db_write',
              tier: paymentRequest.metadata.subscriptionTier,
            });
          }
        } catch (subscriptionErr) {
          log.error(`${FN}.subscription.exception`, {
            stage: 'error',
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
        log.info(`${FN}.notify.created`, { stage: 'notify' });
      } catch (notifError) {
        log.warn(`${FN}.notify.error`, {
          stage: 'notify',
          message: notifError instanceof Error ? notifError.message : String(notifError),
        });
      }

      log.info(`${FN}.done`, {
        stage: 'done',
        terminalReason: 'completed',
        durationMs: Date.now() - startTime,
      });
      return respond({
        success: true,
        message: 'Payment completed successfully',
        paymentId: paymentRequest.paymentId,
        txid: paymentRequest.txid,
        subscriptionCreated: !!paymentRequest.metadata?.subscriptionTier,
      });
    } catch (apiError) {
      log.error(`${FN}.pi_api.exception`, {
        stage: 'pi_api',
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
        lifecycle_id: lifecycleId,
        updated_at: new Date().toISOString(),
      }).eq('payment_id', paymentRequest.paymentId);

      log.transition(existingPayment?.status ?? null, 'cancelled', {
        terminalReason: 'error',
        source: 'pi_api_exception',
      });

      return respond({
        success: false,
        message: 'Payment completion temporarily unavailable',
        paymentId: paymentRequest.paymentId,
        txid: paymentRequest.txid,
      }, 502);
    }
  } catch (error) {
    log.error(`${FN}.unhandled`, {
      stage: 'error',
      message: error instanceof Error ? error.message : String(error),
    });
    return respond({ success: false, message: 'Payment completion service temporarily unavailable' }, 500);
  }
});
