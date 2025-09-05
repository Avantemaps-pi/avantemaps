
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

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

// Create a Supabase client with the Auth context of the function
const supabaseClient = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_ANON_KEY') ?? '',
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
  
  try {
    // Get request body
    const statusRequest: StatusRequest = await req.json();
    
    // Log the request for debugging
    console.log('Payment status request received for payment ID:', statusRequest.paymentId);
    
    // Validate the request
    if (!statusRequest.paymentId) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Missing payment ID' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }
    
    // Get the payment from the database
    const { data, error } = await supabaseClient
      .from('payments')
      .select('*')
      .eq('payment_id', statusRequest.paymentId)
      .single();
      
    if (error) {
      console.error('Database error:', error);
      
      if (error.code === 'PGRST116') {
        // Payment not found
        return new Response(
          JSON.stringify({ 
            success: false, 
            message: 'Payment not found',
            paymentId: statusRequest.paymentId
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
        );
      }
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: "Unable to retrieve payment status",
          paymentId: statusRequest.paymentId
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }
    
    // Check if payment might be voided due to timeout
    let paymentStatus = { ...data.status };
    
    if (checkIfPaymentVoided(data)) {
      console.log('Payment appears to be voided due to timeout:', statusRequest.paymentId);
      paymentStatus.voided = true;
      
      // Update the payment status in the database
      await supabaseClient
        .from('payments')
        .update({
          status: {
            ...data.status,
            voided: true,
            error: 'Payment voided due to timeout. No Pi was transferred.'
          }
        })
        .eq('payment_id', statusRequest.paymentId);
    }
    
    // Return the payment status
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Payment status retrieved successfully',
        paymentId: statusRequest.paymentId,
        txid: data.txid,
        status: paymentStatus
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error('Error in payment-status function:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        message: "Payment status service temporarily unavailable" 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
