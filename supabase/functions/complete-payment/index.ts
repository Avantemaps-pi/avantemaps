import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { paymentId } = body;

    if (!paymentId) {
      return new Response(JSON.stringify({ error: 'Missing paymentId' }), {
        status: 400,
        headers: corsHeaders
      });
    }

    // Fetch the payment request
    const { data: paymentRequest, error: fetchError } = await supabase
      .from('payment_requests')
      .select('*')
      .eq('paymentId', paymentId)
      .single();

    if (fetchError || !paymentRequest) {
      console.error('Payment request not found:', fetchError?.message || 'Unknown error');
      return new Response(JSON.stringify({ error: 'Payment request not found' }), {
        status: 404,
        headers: corsHeaders
      });
    }

    if (!paymentRequest.txid) {
      return new Response(JSON.stringify({ error: 'Transaction ID not found' }), {
        status: 400,
        headers: corsHeaders
      });
    }

    const piNetworkApiUrl = 'https://api.minepi.com/payments';
    const apiKey = Deno.env.get('PI_API_KEY')!;

    try {
      const completeResponse = await fetch(`${piNetworkApiUrl}/${paymentId}/complete`, {
        method: 'POST',
        headers: {
          'Authorization': `Key ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ txid: paymentRequest.txid })
      });

      const completeData = await completeResponse.json();

      if (!completeResponse.ok) {
        console.error(`Error completing payment ${paymentId} with txid ${paymentRequest.txid}:`, completeData);
        return new Response(JSON.stringify({ error: 'Failed to complete payment', details: completeData }), {
          status: 500,
          headers: corsHeaders
        });
      }

      // Update the payment record in Supabase
      const { error: updateError } = await supabase
        .from('payment_requests')
        .update({
          status: {
            ...paymentRequest.status,
            completed: true,
            cancelled: false
          },
          txid: paymentRequest.txid,
          tx_url: `https://pi.blockchain.xyz/tx/${paymentRequest.txid}`,
          completed: true
        })
        .eq('paymentId', paymentId);

      if (updateError) {
        console.error('Error updating payment record in Supabase:', updateError.message);
        return new Response(JSON.stringify({ error: 'Failed to update payment status in database' }), {
          status: 500,
          headers: corsHeaders
        });
      }

      return new Response(JSON.stringify({ message: 'Payment completed successfully' }), {
        status: 200,
        headers: corsHeaders
      });

    } catch (apiError) {
      console.error(`API error while completing payment ${paymentId}:`, apiError);
      return new Response(JSON.stringify({ error: 'Failed to call Pi Network API', details: apiError }), {
        status: 500,
        headers: corsHeaders
      });
    }

  } catch (error) {
    console.error('Unhandled error:', error);
    return new Response(JSON.stringify({ error: 'Internal Server Error', details: error }), {
      status: 500,
      headers: corsHeaders
    });
  }
});
