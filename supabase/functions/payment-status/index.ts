
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import {
  getOrCreateLifecycleId,
  makeLogger,
  correlationHeaders,
  deriveTerminalReason,
} from '../_shared/logger.ts';

const FN = 'payment-status';

const supabaseClient = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
);

function checkIfPaymentVoided(payment: any): boolean {
  const createdAt = new Date(payment.created_at).getTime();
  const now = Date.now();
  const tenMinutesInMs = 10 * 60 * 1000;
  return (
    !payment.status.completed &&
    !payment.status.cancelled &&
    now - createdAt > tenMinutesInMs
  );
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const lifecycleId = getOrCreateLifecycleId(req);
  const log = makeLogger({ fn: FN, lifecycleId });

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
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      log.warn(`${FN}.auth.missing_header`, { stage: 'validation' });
      return respond({ success: false, message: 'Unauthorized - authentication required' }, 401);
    }

    const token = authHeader.replace('Bearer ', '');
    let userId: string;
    try {
      const jwt = JSON.parse(atob(token.split('.')[1]));
      userId = jwt.sub;
      if (!userId) throw new Error('Invalid token: missing user ID');
    } catch (jwtError) {
      log.error(`${FN}.auth.invalid_jwt`, {
        stage: 'validation',
        message: jwtError instanceof Error ? jwtError.message : String(jwtError),
      });
      return respond({ success: false, message: 'Invalid authentication token' }, 401);
    }

    log.extend({ userId });

    const statusRequest: { paymentId?: string } = await req.json();

    if (!statusRequest.paymentId) {
      log.warn(`${FN}.validation.missing_payment_id`, { stage: 'validation' });
      return respond({ success: false, message: 'Missing payment ID' }, 400);
    }

    log.extend({ paymentId: statusRequest.paymentId });
    log.info(`${FN}.validation.ok`, { stage: 'validation' });

    const { data, error } = await supabaseClient
      .from('payments')
      .select('*')
      .eq('payment_id', statusRequest.paymentId)
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        log.warn(`${FN}.lookup.not_found`, { stage: 'lookup' });
        return respond({
          success: false,
          message: 'Payment not found or access denied',
          paymentId: statusRequest.paymentId,
        }, 404);
      }
      log.error(`${FN}.lookup.error`, {
        stage: 'lookup',
        code: error.code,
        message: error.message,
      });
      return respond({
        success: false,
        message: 'Unable to retrieve payment status',
        paymentId: statusRequest.paymentId,
      }, 500);
    }

    let paymentStatus = { ...data.status };

    if (checkIfPaymentVoided(data)) {
      log.transition(data.status, { ...data.status, voided: true }, {
        terminalReason: 'voided',
        source: 'timeout',
      });
      paymentStatus.voided = true;

      await supabaseClient
        .from('payments')
        .update({
          status: {
            ...data.status,
            voided: true,
            error: 'Payment voided due to timeout. No Pi was transferred.',
          },
        })
        .eq('payment_id', statusRequest.paymentId);
    }

    const terminalReason = deriveTerminalReason(paymentStatus);
    log.info(`${FN}.done`, {
      stage: 'done',
      terminalReason,
      currentStatus: paymentStatus,
    });

    return respond({
      success: true,
      message: 'Payment status retrieved successfully',
      paymentId: statusRequest.paymentId,
      txid: data.txid,
      status: paymentStatus,
      terminalReason,
    });
  } catch (error) {
    log.error(`${FN}.unhandled`, {
      stage: 'error',
      message: error instanceof Error ? error.message : String(error),
    });
    return respond({ success: false, message: 'Payment status service temporarily unavailable' }, 500);
  }
});
