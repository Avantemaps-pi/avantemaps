
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
  
  try {
    // Extract and validate JWT for authentication
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      console.log('Payment status request denied: No authorization header');
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Unauthorized - authentication required' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    // Decode JWT to get user ID
    const token = authHeader.replace('Bearer ', '');
    let userId: string;
    try {
      const jwt = JSON.parse(atob(token.split('.')[1]));
      userId = jwt.sub;
      if (!userId) {
        throw new Error('Invalid token: missing user ID');
      }
    } catch (jwtError) {
      console.error('Invalid JWT token:', jwtError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Invalid authentication token' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }
    
    // Get request body
    const statusRequest: StatusRequest = await req.json();
    
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
    
    console.log('Payment status request received');
    
    // Get the payment from the database - ONLY for the authenticated user
    const { data, error } = await supabaseClient
      .from('payments')
      .select('*')
      .eq('payment_id', statusRequest.paymentId)
      .eq('user_id', userId) // Authorization check: user can only view their own payments
      .single();
      
    if (error) {
      console.error('Database error:', error);
      
      if (error.code === 'PGRST116') {
        // Payment not found or user doesn't own it
        console.log('Payment not found or unauthorized access attempt');
        return new Response(
          JSON.stringify({ 
            success: false, 
            message: 'Payment not found or access denied',
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
      console.log('Payment voided due to timeout');
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
