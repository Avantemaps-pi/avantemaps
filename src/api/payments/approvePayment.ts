/**
 * Payment approval endpoint
 *
 * Calls the `approve-payment` Supabase Edge Function. Forwards an
 * end-to-end correlation ID via `x-correlation-id` so client and server
 * logs can be lined up across the entire payment lifecycle.
 */
import { supabase } from '@/integrations/supabase/client';
import { PaymentRequest, PaymentResponse } from './types';
import {
  correlationHeaders,
  generateCorrelationId,
  CORRELATION_HEADER,
} from '@/utils/correlation';

export const approvePayment = async (
  req: PaymentRequest,
  opts: { correlationId?: string } = {}
): Promise<PaymentResponse & { correlationId: string }> => {
  const correlationId = opts.correlationId ?? generateCorrelationId('approve');
  const log = (level: 'info' | 'warn' | 'error', event: string, extra?: Record<string, unknown>) => {
    const line = JSON.stringify({
      ts: new Date().toISOString(),
      level,
      event,
      fn: 'client.approvePayment',
      correlationId,
      paymentId: req.paymentId,
      ...(extra ?? {}),
    });
    if (level === 'error') console.error(line);
    else if (level === 'warn') console.warn(line);
    else console.log(line);
  };

  log('info', 'approve.request.start');

  try {
    const timeoutPromise = new Promise<PaymentResponse>((_, reject) => {
      setTimeout(() => reject(new Error('Payment approval request timed out')), 20000);
    });

    const fetchPromise = supabase.functions
      .invoke('approve-payment', {
        body: JSON.stringify(req),
        headers: correlationHeaders(correlationId),
      })
      .then(({ data, error }) => {
        if (error) {
          log('error', 'approve.request.error', { message: error.message });
          return {
            success: false,
            message: `Failed to approve payment: ${error.message}`,
            paymentId: req.paymentId,
          } as PaymentResponse;
        }
        log('info', 'approve.request.success', {
          serverCorrelationId: (data as any)?.correlationId,
        });
        return data as PaymentResponse;
      });

    const result = await Promise.race([fetchPromise, timeoutPromise]);
    return { ...result, correlationId };
  } catch (fetchError) {
    log('error', 'approve.request.exception', {
      message: fetchError instanceof Error ? fetchError.message : 'Unknown error',
    });
    return {
      success: false,
      message:
        'Payment approval request failed: ' +
        (fetchError instanceof Error ? fetchError.message : 'Unknown error'),
      paymentId: req.paymentId,
      correlationId,
    };
  }
};

export { CORRELATION_HEADER };
