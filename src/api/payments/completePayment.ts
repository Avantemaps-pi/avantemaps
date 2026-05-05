/**
 * Payment completion endpoint
 *
 * Calls the `complete-payment` Supabase Edge Function. Forwards an
 * end-to-end correlation ID so the entire approve → complete → status
 * lifecycle can be traced in one query.
 */
import { supabase } from '@/integrations/supabase/client';
import { PaymentRequest, PaymentResponse } from './types';
import {
  correlationHeaders,
  generateCorrelationId,
} from '@/utils/correlation';

export const completePayment = async (
  req: PaymentRequest & { txid: string },
  opts: { correlationId?: string } = {}
): Promise<PaymentResponse & { correlationId: string }> => {
  const correlationId = opts.correlationId ?? generateCorrelationId('complete');
  const log = (level: 'info' | 'warn' | 'error', event: string, extra?: Record<string, unknown>) => {
    const line = JSON.stringify({
      ts: new Date().toISOString(),
      level,
      event,
      fn: 'client.completePayment',
      correlationId,
      paymentId: req.paymentId,
      txid: req.txid,
      ...(extra ?? {}),
    });
    if (level === 'error') console.error(line);
    else if (level === 'warn') console.warn(line);
    else console.log(line);
  };

  log('info', 'complete.request.start');

  try {
    const timeoutPromise = new Promise<PaymentResponse>((_, reject) => {
      setTimeout(() => reject(new Error('Payment completion request timed out')), 20000);
    });

    const fetchPromise = supabase.functions
      .invoke('complete-payment', {
        body: JSON.stringify(req),
        headers: correlationHeaders(correlationId),
      })
      .then(({ data, error }) => {
        if (error) {
          log('error', 'complete.request.error', { message: error.message });
          return {
            success: false,
            message: `Failed to complete payment: ${error.message}`,
            paymentId: req.paymentId,
            txid: req.txid,
          } as PaymentResponse;
        }
        log('info', 'complete.request.success', {
          serverCorrelationId: (data as any)?.correlationId,
        });
        return data as PaymentResponse;
      });

    const result = await Promise.race([fetchPromise, timeoutPromise]);
    return { ...result, correlationId };
  } catch (fetchError) {
    log('error', 'complete.request.exception', {
      message: fetchError instanceof Error ? fetchError.message : 'Unknown error',
    });
    return {
      success: false,
      message:
        'Payment completion request failed: ' +
        (fetchError instanceof Error ? fetchError.message : 'Unknown error'),
      paymentId: req.paymentId,
      txid: req.txid,
      correlationId,
    };
  }
};
