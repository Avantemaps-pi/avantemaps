
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

interface CleanupRequest {
  userId: string;
}

const supabaseClient = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_ANON_KEY') ?? '',
);

// Check if a payment is stale (older than 10 minutes and not completed)
function isStalePayment(payment: any): boolean {
  const createdAt = new Date(payment.created_at).getTime();
  const now = Date.now();
  const tenMinutesInMs = 10 * 60 * 1000; // 10 minutes
  
  return (
    !payment.status.completed && 
    !payment.status.cancelled && 
    (now - createdAt) > tenMinutesInMs
  );
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { userId }: CleanupRequest = await req.json();
    console.log(`Cleaning up stale payments for user: ${userId}`);

    if (!userId) {
      return new Response(
        JSON.stringify({ success: false, message: 'Missing user ID' }),
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

    // Find all stale payments for this user
    const { data: payments, error: fetchError } = await supabaseClient
      .from('payments')
      .select('*')
      .eq('user_id', userId)
      .eq('status->completed', false)
      .eq('status->cancelled', false);

    if (fetchError) {
      console.error('Error fetching payments:', fetchError);
      return new Response(
        JSON.stringify({ success: false, message: 'Error fetching payments' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    if (!payments || payments.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'No stale payments found', cleanedCount: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const stalePayments = payments.filter(isStalePayment);
    let cleanedCount = 0;

    console.log(`Found ${stalePayments.length} stale payments to clean up`);

    // Clean up each stale payment
    for (const payment of stalePayments) {
      try {
        console.log(`Cleaning up stale payment: ${payment.payment_id}`);

        // Try to cancel with Pi Network API
        const piNetworkApiUrl = 'https://api.minepi.com/v2/payments';
        const cancelResponse = await fetch(`${piNetworkApiUrl}/${payment.payment_id}/cancel`, {
          method: 'POST',
          headers: {
            'Authorization': `Key ${piApiKey}`,
            'Content-Type': 'application/json'
          }
        });

        console.log(`Pi Network cancel response for ${payment.payment_id}:`, cancelResponse.status);

        // Update our database regardless of Pi Network response
        const { error: updateError } = await supabaseClient
          .from('payments')
          .update({
            status: {
              approved: false,
              verified: false,
              completed: false,
              cancelled: true,
              error: 'Payment automatically cancelled due to staleness (>10 minutes old)'
            },
            updated_at: new Date().toISOString()
          })
          .eq('payment_id', payment.payment_id);

        if (!updateError) {
          cleanedCount++;
          console.log(`Successfully cleaned up payment: ${payment.payment_id}`);
        } else {
          console.error(`Error updating payment ${payment.payment_id}:`, updateError);
        }

      } catch (error) {
        console.error(`Error cleaning up payment ${payment.payment_id}:`, error);
        // Continue with other payments even if one fails
      }
    }

    console.log(`Cleanup completed. Cleaned ${cleanedCount} stale payments.`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Cleaned up ${cleanedCount} stale payments`, 
        cleanedCount 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in cleanup-stale-payments function:', error);
    return new Response(
      JSON.stringify({ success: false, message: `Server error: ${error.message}` }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
