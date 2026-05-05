
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import {
  getOrCreateCorrelationId,
  makeLogger,
  correlationHeaders,
} from '../_shared/logger.ts';

interface StatusRequest {
  paymentId: string;
}

interface PaymentResponse {
  success: boolean;
  message: string;
  paymentId?: string;
  txid?: string;
  status?: {
    approved: boolean;
    verified: boolean;
    completed: boolean;
    cancelled: boolean;
    voided?: boolean;
    error?: string;
  };
}

// Create a Supabase client with service role key for database operations
const supabaseClient = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
);

// Helper function to check if a payment is likely voided due to timeout
function checkIfPaymentVoided(payment: any): boolean {
  // If a payment was created more than 10 minutes ago and hasn't been completed,
  // it's likely voided by the Pi Network system
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
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  
  const correlationId = getOrCreateCorrelationId(req);
  const log = makeLogger({ fn: 'payment-status', correlationId });

  const respond = (body: Record<string, unknown>, status = 200) =>
    new Response(JSON.stringify({ ...body, correlationId }), {
      headers: {
        ...corsHeaders,
        ...correlationHeaders(correlationId),
        'Content-Type': 'application/json',
      },
      status,
    });

  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      log.warn('status.unauthorized.no_header');
      return respond({ success: false, message: 'Unauthorized - authentication required' }, 401);
    }

    const token = authHeader.replace('Bearer ', '');
    let userId: string;
    try {
      const jwt = JSON.parse(atob(token.split('.')[1]));
      userId = jwt.sub;
      if (!userId) throw new Error('Invalid token: missing user ID');
    } catch (jwtError) {
      log.error('status.invalid_jwt', {
        message: jwtError instanceof Error ? jwtError.message : String(jwtError),
      });
      return respond({ success: false, message: 'Invalid authentication token' }, 401);
    }

    log.extend({ userId });

    const statusRequest: { paymentId?: string } = await req.json();

    if (!statusRequest.paymentId) {
      log.warn('status.missing_payment_id');
      return respond({ success: false, message: 'Missing payment ID' }, 400);
    }

    log.extend({ paymentId: statusRequest.paymentId });
    log.info('status.request');

    const { data, error } = await supabaseClient
      .from('payments')
      .select('*')
      .eq('payment_id', statusRequest.paymentId)
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        log.warn('status.not_found_or_unauthorized');
        return respond({
          success: false,
          message: 'Payment not found or access denied',
          paymentId: statusRequest.paymentId,
        }, 404);
      }
      log.error('status.db_error', { code: error.code, message: error.message });
      return respond({
        success: false,
        message: 'Unable to retrieve payment status',
        paymentId: statusRequest.paymentId,
      }, 500);
    }

    let paymentStatus = { ...data.status };

    if (checkIfPaymentVoided(data)) {
      log.info('status.transition', { from: data.status, to: 'voided' });
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

    log.info('status.response', { status: paymentStatus });

    return respond({
      success: true,
      message: 'Payment status retrieved successfully',
      paymentId: statusRequest.paymentId,
      txid: data.txid,
      status: paymentStatus,
    });
  } catch (error) {
    log.error('status.unhandled', {
      message: error instanceof Error ? error.message : String(error),
    });
    return respond({ success: false, message: 'Payment status service temporarily unavailable' }, 500);
  }
});
