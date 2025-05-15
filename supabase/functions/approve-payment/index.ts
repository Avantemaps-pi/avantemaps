import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

interface PaymentRequest {
  paymentId: string;
  userId: string;
  amount: number;
  memo: string;
  metadata: Record<string, any>;
}

interface PaymentResponse {
  success: boolean;
  message: string;
  paymentId?: string;
  txid?: string;
}

// Determine subscription tier based on payment amount
function determineSubscriptionTier(amount: number, metadata: Record<string, any>): string {
  if (metadata?.subscriptionTier) return metadata.subscriptionTier;
  if (amount < 1) return 'individual';
  if (amount < 10) return 'small-business';
  return 'organization';
}

const supabaseClient = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_ANON_KEY') ?? '',
);

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const startTime = Date.now();
  console.log(`Starting payment approval at ${new Date().toISOString()}`);

  try {
    const paymentRequest: PaymentRequest = await req.json();
    console.log('Payment approval request received:', paymentRequest);

    if (!paymentRequest.paymentId) {
      return new Response(
        JSON.stringify({ success: false, message: 'Missing payment ID' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    const piApiKey = Deno.env.get('PI_API_KEY');
    if (!piApiKey) {
      console.error('PI_API_KEY not configured');
      return new Response(
        JSON.stringify({ success: false, message: 'Payment service not configured' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    const { data: existingPayment, error: checkError } = await supabaseClient
      .from('payments')
      .select('status')
      .eq('payment_id', paymentRequest.paymentId)
      .single();

    if (existingPayment?.status?.approved) {
      return new Response(
        JSON.stringify({ success: true, message: 'Payment was already approved', paymentId: paymentRequest.paymentId }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
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
            cancelled: false
          }
        });
      if (error && error.code !== '23505') {
        return new Response(
          JSON.stringify({ success: false, message: `Database error: ${error.message}`, paymentId: paymentRequest.paymentId }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        );
      }
    }

    try {
      const piNetworkApiUrl = 'https://api.minepi.com/v2/payments';
      const approveResponse = await fetch(`${piNetworkApiUrl}/${paymentRequest.paymentId}/approve`, {
        method: 'POST',
        headers: {
          'Authorization': `Key ${piApiKey}`,
          'Content-Type': 'application/json'
        }
      });

      const approveResult = await approveResponse.json();

      if (!approveResponse.ok) {
        if (approveResult.message?.includes('already approved')) {
          await supabaseClient.from('payments').update({
            status: {
              approved: true,
              verified: false,
              completed: false,
              cancelled: false
            },
            updated_at: new Date().toISOString()
          }).eq('payment_id', paymentRequest.paymentId);

          return new Response(
            JSON.stringify({ success: true, message: 'Payment was already approved', paymentId: paymentRequest.paymentId }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        await supabaseClient.from('payments').update({
          status: {
            approved: false,
            verified: false,
            completed: false,
            cancelled: true,
            error: `Pi Network API error: ${JSON.stringify(approveResult)}`
          },
          updated_at: new Date().toISOString()
        }).eq('payment_id', paymentRequest.paymentId);

        return new Response(
          JSON.stringify({ success: false, message: `Pi Network API error: ${approveResult.message || 'Unknown error'}`, paymentId: paymentRequest.paymentId }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 502 }
        );
      }

      await supabaseClient.from('payments').update({
        status: {
          approved: true,
          verified: false,
          completed: false,
          cancelled: false
        },
        updated_at: new Date().toISOString()
      }).eq('payment_id', paymentRequest.paymentId);

      const subscriptionTier = determineSubscriptionTier(paymentRequest.amount, paymentRequest.metadata);
      const duration = Number(paymentRequest.metadata?.duration) || null; // in days
      const now = new Date();
      const endDate = duration ? new Date(now.getTime() + duration * 86400000) : null;

      const { data: userData, error: userError } = await supabaseClient
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
                duration: duration,
                start_date: now.toISOString(),
                end_date: endDate?.toISOString() || null
              });

            if (subError) console.error('Error recording subscription history:', subError);
          }
        } else {
          console.log(`User already has equal or better subscription.`);
        }
      } else {
        console.log(`User ${paymentRequest.userId} not found.`);
      }

      const endTime = Date.now();
      console.log(`Payment approval completed in ${endTime - startTime}ms`);

      return new Response(
        JSON.stringify({ success: true, message: 'Payment approved successfully', paymentId: paymentRequest.paymentId }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } catch (apiError) {
      await supabaseClient.from('payments').update({
        status: {
          approved: false,
          verified: false,
          completed: false,
          cancelled: true,
          error: `API call error: ${apiError.message}`
        },
        updated_at: new Date().toISOString()
      }).eq('payment_id', paymentRequest.paymentId);

      return new Response(
        JSON.stringify({ success: false, message: `Error calling Pi Network API: ${apiError.message}`, paymentId: paymentRequest.paymentId }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 502 }
      );
    }
  } catch (error) {
    console.error('Error in approve-payment function:', error);
    return new Response(
      JSON.stringify({ success: false, message: `Server error: ${error.message}` }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
