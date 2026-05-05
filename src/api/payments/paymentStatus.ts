/**
 * Payment status endpoint
 *
 * Calls the `payment-status` Supabase Edge Function. Forwards the
 * end-to-end correlation ID (when provided) so polling logs are tied
 * back to the original approve / complete attempt.
 */
import { supabase } from '@/integrations/supabase/client';
import { PaymentResponse } from './types';
import { correlationHeaders, generateCorrelationId } from '@/utils/correlation';

export const getPaymentStatus = async (
  paymentId: string,
  opts: { correlationId?: string } = {}
): Promise<PaymentResponse & { correlationId: string }> => {
  const correlationId = opts.correlationId ?? generateCorrelationId('status');
  try {
    const { data, error } = await supabase.functions.invoke('payment-status', {
      body: JSON.stringify({ paymentId }),
      headers: correlationHeaders(correlationId),
    });

    if (error) {
      console.error(
        JSON.stringify({
          ts: new Date().toISOString(),
          level: 'error',
          event: 'status.request.error',
          fn: 'client.getPaymentStatus',
          correlationId,
          paymentId,
          message: error.message,
        })
      );
      return {
        success: false,
        message: `Failed to get payment status: ${error.message}`,
        paymentId,
        correlationId,
      };
    }

    return { ...(data as PaymentResponse), correlationId };
  } catch (error) {
    console.error(
      JSON.stringify({
        ts: new Date().toISOString(),
        level: 'error',
        event: 'status.request.exception',
        fn: 'client.getPaymentStatus',
        correlationId,
        paymentId,
        message: error instanceof Error ? error.message : 'Unknown error',
      })
    );
    return {
      success: false,
      message:
        'Failed to get payment status: ' +
        (error instanceof Error ? error.message : 'Unknown error'),
      paymentId,
      correlationId,
    };
  }
};
