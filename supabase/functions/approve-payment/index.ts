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
  if (metadata && metadata.subscriptionTier) {
    return metadata.subscriptionTier;
  }
  if (amount < 1) {
    return 'individual';
  } else if (amount < 10) {
    return 'small-business';
  } else {
    return 'organization';
  }
}

// Fetch with timeout helper
function fetchWithTimeout(resource: RequestInfo, options: RequestInit = {}, timeout = 15000): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  return fetch(resource, { ...options, signal: controller.signal })
    .finally(() => clearTimeout(id));
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
      console.error('PI_API_KEY not configured in Supabase secrets');
      return new Response(
        JSON.stringify({ success: false, message: 'Payment service not properly configured' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    const dbCheckStart = Date.now();
    const { data: existingPayment, error: checkError } = await supabaseClient
      .from('payments')
      .select('status')
      .eq('payment_id', paymentRequest.paymentId)
      .single();
    console.log(`DB payment check completed in ${Date.now() - dbCheckStart}ms`);

    if (existingPayment?.status?.approved) {
      console.log('Payment was already approved previously:', paymentRequest.paymentId);
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Payment was already approved',
          paymentId: paymentRequest.paymentId,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!existingPayment) {
      const dbInsertStart = Date.now();
      const { data, error } = await supabaseClient
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
            cancelled: false,
          },
        })
        .select()
        .single();
      console.log(`DB payment insert completed in ${Date.now() - dbInsertStart}ms`);

      if (error) {
        if (error.code === '23505') {
          console.log('Payment already exists in database:', paymentRequest.paymentId);
        } else {
          console.error('Database error:', error);
          return new Response(
            JSON.stringify({
              success: false,
              message: `Database error: ${error.message}`,
              paymentId: paymentRequest.paymentId,
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
          );
        }
      }
    } else {
      console.log('Payment exists but needs approval:', paymentRequest.paymentId);
    }

    try {
      const piNetworkApiUrl = 'https://api.minepi.com/v2/payments';

      console.log('Calling Pi Network API to approve payment:', paymentRequest.paymentId);
      console.log('API key used (first 4 chars):', piApiKey?.substring(0, 4));

      const apiCallStart = Date.now();
      const approveResponse = await fetchWithTimeout(
        `${piNetworkApiUrl}/${paymentRequest.paymentId}/approve`,
        {
          method: 'POST',
          headers: {
            Authorization: `Key ${piApiKey}`,
            'Content-Type': 'application/json',
          },
        },
        15000 // 15 seconds timeout
      );
      const approveResult = await approveResponse.json();
      console.log(`Pi Network API approve call completed in ${Date.now() - apiCallStart}ms`);
      console.log('Pi Network API approve payment response:', approveResult);

      if (!approveResponse.ok) {
        console.error('Pi Network API error:', approveResult);

        if (approveResult.message && approveResult.message.includes('already approved')) {
          console.log('Payment was already approved on Pi Network side');

          await supabaseClient
            .from('payments')
            .update({
              status: {
                approved: true,
                verified: false,
                completed: false,
                cancelled: false,
              },
              updated_at: new Date().toISOString(),
            })
            .eq('payment_id', paymentRequest.paymentId);

          return new Response(
            JSON.stringify({
              success: true,
              message: 'Payment was already approved',
              paymentId: paymentRequest.paymentId,
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        await supabaseClient
          .from('payments')
          .update({
            status: {
              approved: false,
              verified: false,
              completed: false,
              cancelled: true,
              error: `Pi Network API error: ${JSON.stringify(approveResult)}`,
            },
            updated_at: new Date().toISOString(),
          })
          .eq('payment_id', paymentRequest.paymentId);

        return new Response(
          JSON.stringify({
            success: false,
            message: `Pi Network API error: ${approveResult.message || 'Unknown error'}`,
            paymentId: paymentRequest.paymentId,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 502 }
        );
      }

      const dbUpdateStart = Date.now();
      await supabaseClient
        .from('payments')
        .update({
          status: {
            approved: true,
            verified: false,
            completed: false,
            cancelled: false,
          },
          updated_at: new Date().toISOString(),
        })
        .eq('payment_id', paymentRequest.paymentId);
      console.log(`DB payment status update completed in ${Date.now() - dbUpdateStart}ms`);

      const subscriptionTier = determineSubscriptionTier(paymentRequest.amount, paymentRequest.metadata);
      console.log(`Updating user ${paymentRequest.userId} to subscription tier: ${subscriptionTier}`);

      const userCheckStart = Date.now();
      const { data: userData, error: userError } = await supabaseClient
        .from('users')
        .select('id, subscription')
        .eq('id', paymentRequest.userId)
        .maybeSingle();
      console.log(`DB user check completed in ${Date.now() - userCheckStart}ms`);

      if (userError) {
        console.error('Error checking user existence:', userError);
      }

      if (userData) {
        const shouldUpdate =
          !userData.subscription ||
          subscriptionTier === 'organization' ||
          (subscriptionTier === 'small-business' && userData.subscription === 'individual');

        if (shouldUpdate) {
          const userUpdateStart = Date.now();
          const { error: updateError } = await supabaseClient
            .from('users')
            .update({ subscription: subscriptionTier })
            .eq('id', paymentRequest.userId);
          console.log(`DB user subscription update completed in ${Date.now() - userUpdateStart}ms`);

          if (updateError) {
            console.error('Error updating user subscription:', updateError);
          } else {
            console.log(`Successfully updated user ${paymentRequest.userId} to tier ${subscriptionTier}`);

            const subInsertStart = Date.now();
            const { error: subError } = await supabaseClient
              .from('subscriptions')
              .insert({
                user_id: paymentRequest.userId,
                plan: subscriptionTier,
                start_date: new Date().toISOString(),
                end_date: paymentRequest.metadata?.duration
                  ? new Date(Date.now() + paymentRequest.metadata.duration * 86400000).toISOString()
                  : null,
              });
            console.log(`DB subscription history insert completed in ${Date.now() - subInsertStart}ms`);

            if (subError) {
              console.error('Error recording subscription history:', subError);
            }
          }
        } else {
          console.log(`User already has equal or better subscription. Not downgrading.`);
        }
      } else {
        console.log(`User ${paymentRequest.userId} not found in database. Cannot update subscription.`);
      }

      const endTime = Date.now();
      console.log(`Payment approval completed in ${endTime - startTime}ms`);

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Payment approved successfully',
          paymentId: paymentRequest.paymentId,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } catch (apiError) {
      console.error('Error calling Pi Network API:', apiError);

      await supabaseClient
        .from('payments')
        .update({
          status: {
            approved: false,
            verified: false,
            completed: false,
            cancelled: true,
            error: `API call error: ${apiError.message}`,
          },
          updated_at: new Date().toISOString(),
        })
        .eq('payment_id', paymentRequest.paymentId);

      return new Response(
        JSON.stringify({
          success: false,
          message: `Error calling Pi Network API: ${apiError.message}`,
          paymentId: paymentRequest.paymentId,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 502 }
      );
    }
  } catch (error) {
    console.error('Error in approve-payment function:', error);

    return new Response(
      JSON.stringify({
        success: false,
        message: `Server error: ${error.message}`,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
