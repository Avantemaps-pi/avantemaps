/**
 * Payment status endpoint
 *
 * Calls the `payment-status` Supabase Edge Function. Forwards the
 * end-to-end lifecycle ID (when provided) so polling logs are tied
 * back to the original approve / complete attempt.
 */
import { supabase } from '@/integrations/supabase/client';
import { PaymentResponse } from './types';
import { correlationHeaders, generateLifecycleId } from '@/utils/correlation';

const FN = 'client.payment-status';

function emit(
  level: 'info' | 'warn' | 'error',
  event: string,
  base: Record<string, unknown>,
  extra?: Record<string, unknown>
) {
  const line = JSON.stringify({
    ts: new Date().toISOString(),
    level,
    event,
    fn: FN,
    ...base,
    ...(extra ?? {}),
  });
  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
  else console.log(line);
}

export const getPaymentStatus = async (
  paymentId: string,
  opts: { lifecycleId?: string; correlationId?: string } = {}
): Promise<PaymentResponse & { lifecycleId: string; correlationId: string }> => {
  const lifecycleId =
    opts.lifecycleId ?? opts.correlationId ?? generateLifecycleId('status');
  const base = { lifecycleId, paymentId, stage: 'pi_api' as const };

  try {
    const { data, error } = await supabase.functions.invoke('payment-status', {
      body: JSON.stringify({ paymentId }),
      headers: correlationHeaders(lifecycleId),
    });

    if (error) {
      emit('error', `${FN}.request.error`, base, { message: error.message });
      return {
        success: false,
        message: `Failed to get payment status: ${error.message}`,
        paymentId,
        lifecycleId,
        correlationId: lifecycleId,
      };
    }

    return { ...(data as PaymentResponse), lifecycleId, correlationId: lifecycleId };
  } catch (error) {
    emit('error', `${FN}.request.exception`, base, {
      message: error instanceof Error ? error.message : 'Unknown error',
    });
    return {
      success: false,
      message:
        'Failed to get payment status: ' +
        (error instanceof Error ? error.message : 'Unknown error'),
      paymentId,
      lifecycleId,
      correlationId: lifecycleId,
    };
  }
};
