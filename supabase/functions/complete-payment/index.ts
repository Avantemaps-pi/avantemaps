import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

interface PaymentRequest {
  paymentId: string;
  txid: string;
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

const supabaseClient = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
);

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const startTime = Date.now();
  console.log(`Starting payment completion at ${new Date().toISOString()}`);

  try {
    const paymentRequest: PaymentRequest = await req.json();
    console.log('Payment completion request received:', paymentRequest);

    if (!paymentRequest.paymentId || !paymentRequest.txid) {
      return new Response(
        JSON.stringify({ success: false, message: 'Missing payment ID or transaction ID' }),
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

    // Step 7: Server-Side Completion - Call Pi Servers /complete API
    try {
      const piNetworkApiUrl = 'https://api.minepi.com/v2/payments';
      const completeResponse = await fetch(`${piNetworkApiUrl}/${paymentRequest.paymentId}/complete`, {
        method: 'POST',
        headers: {
          'Authorization': `Key ${piApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ txid: paymentRequest.txid })
      });

      const completeResult = await completeResponse.json();
      console.log('Pi Network completion API response:', completeResult);

      if (!completeResponse.ok) {
        // Check if payment was already completed
        if (completeResult.message?.includes('already completed')) {
          console.log(`Payment ${paymentRequest.paymentId} was already completed`);
          
          // Update our database to reflect completion
          await supabaseClient.from('payments').update({
            status: {
              approved: true,
              verified: true,
              completed: true,
              cancelled: false
            },
            txid: paymentRequest.txid,
            updated_at: new Date().toISOString()
          }).eq('payment_id', paymentRequest.paymentId);

          return new Response(
            JSON.stringify({ 
              success: true, 
              message: 'Payment was already completed', 
              paymentId: paymentRequest.paymentId,
              txid: paymentRequest.txid 
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Handle other Pi Network API errors
        await supabaseClient.from('payments').update({
          status: {
            approved: true,
            verified: false,
            completed: false,
            cancelled: true,
            error: `Pi Network completion API error: ${JSON.stringify(completeResult)}`
          },
          updated_at: new Date().toISOString()
        }).eq('payment_id', paymentRequest.paymentId);

        return new Response(
          JSON.stringify({ 
            success: false, 
            message: `Pi Network completion API error: ${completeResult.message || 'Unknown error'}`, 
            paymentId: paymentRequest.paymentId,
            txid: paymentRequest.txid 
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 502 }
        );
      }

      // Payment completed successfully - update database
      await supabaseClient.from('payments').update({
        status: {
          approved: true,
          verified: true,
          completed: true,
          cancelled: false
        },
        txid: paymentRequest.txid,
        updated_at: new Date().toISOString()
      }).eq('payment_id', paymentRequest.paymentId);

      const endTime = Date.now();
      console.log(`Payment completion successful in ${endTime - startTime}ms`);

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Payment completed successfully', 
          paymentId: paymentRequest.paymentId,
          txid: paymentRequest.txid 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } catch (apiError) {
      console.error('Error calling Pi Network completion API:', apiError);
      
      await supabaseClient.from('payments').update({
        status: {
          approved: true,
          verified: false,
          completed: false,
          cancelled: true,
          error: `API call error: ${apiError.message}`
        },
        updated_at: new Date().toISOString()
      }).eq('payment_id', paymentRequest.paymentId);

      return new Response(
        JSON.stringify({ 
          success: false, 
          message: `Error calling Pi Network completion API: ${apiError.message}`, 
          paymentId: paymentRequest.paymentId,
          txid: paymentRequest.txid 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 502 }
      );
    }

  } catch (error) {
    console.error('Error in complete-payment function:', error);
    return new Response(
      JSON.stringify({ success: false, message: `Server error: ${error.message}` }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});