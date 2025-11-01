import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

// Validation schema for payment completion requests with strict input validation
const PaymentRequestSchema = z.object({
  paymentId: z.string()
    .min(1, 'Payment ID is required')
    .max(100, 'Payment ID too long')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Invalid payment ID format'),
  txid: z.string()
    .min(1, 'Transaction ID is required')
    .max(128, 'Transaction ID too long')
    .regex(/^[a-fA-F0-9]+$/, 'Invalid transaction ID format'),
  userId: z.string().uuid('Invalid user ID format'),
  amount: z.number().positive('Amount must be positive').max(1000000, 'Amount exceeds maximum'),
  memo: z.string().max(500, 'Memo too long').transform(val => 
    val.replace(/[<>]/g, '') // Sanitize potential HTML/script tags
  ).optional(),
  metadata: z.object({
    subscriptionTier: z.enum(['individual', 'small-business', 'organization']).optional(),
    frequency: z.enum(['monthly', 'annual']).optional(),
    duration: z.number().int().positive().max(365).optional()
  }).strict() // Only allow known keys for security
});

type PaymentRequest = z.infer<typeof PaymentRequestSchema>;

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
    // Parse and validate request body
    const rawBody = await req.json();
    const validationResult = PaymentRequestSchema.safeParse(rawBody);
    
    if (!validationResult.success) {
      console.error('Invalid payment completion request data:', validationResult.error.errors);
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Invalid request data',
          errors: validationResult.error.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message
          }))
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }
    
    const paymentRequest = validationResult.data;
    console.log('Payment completion request received');

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
      console.log('Pi Network completion API response received');

      if (!completeResponse.ok) {
        // Check if payment was already completed
        if (completeResult.message?.includes('already completed')) {
          console.log('Payment already completed');
          
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

        console.error('Pi Network completion API error:', completeResult);
        return new Response(
          JSON.stringify({ 
            success: false, 
            message: 'Payment completion failed. Please try again.'
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

      // Handle subscription creation if payment is completed successfully
      if (paymentRequest.metadata?.subscriptionTier) {
        try {
          // Get user data from metadata or create defaults
          const metadata = paymentRequest.metadata as any;
          const username = metadata?.username || `user_${paymentRequest.userId.slice(0, 8)}`;
          const email = metadata?.email || `${username}@pi.app`;
          
          // Call the database function to handle subscription
          const { error: subscriptionError } = await supabaseClient.rpc('handle_subscription_after_payment', {
            p_user_id: paymentRequest.userId,
            p_username: username,
            p_email: email,
            p_subscription_tier: paymentRequest.metadata.subscriptionTier
          });

          if (subscriptionError) {
            console.error('Subscription creation error:', subscriptionError);
            // Don't fail the entire request since payment was successful
          } else {
            console.log('Subscription created successfully');
          }
        } catch (subscriptionErr) {
          console.error('Error handling subscription:', subscriptionErr);
          // Don't fail the entire request since payment was successful
        }
      }

      const endTime = Date.now();
      console.log(`Payment completion successful in ${endTime - startTime}ms`);

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Payment completed successfully', 
          paymentId: paymentRequest.paymentId,
          txid: paymentRequest.txid,
          subscriptionCreated: !!paymentRequest.metadata?.subscriptionTier
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
          error: `API call error: ${apiError instanceof Error ? apiError.message : String(apiError)}`
        },
        updated_at: new Date().toISOString()
      }).eq('payment_id', paymentRequest.paymentId);

      return new Response(
        JSON.stringify({ 
          success: false, 
          message: "Payment completion temporarily unavailable", 
          paymentId: paymentRequest.paymentId,
          txid: paymentRequest.txid 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 502 }
      );
    }

  } catch (error) {
    console.error('Error in complete-payment function:', error);
    return new Response(
      JSON.stringify({ success: false, message: "Payment completion service temporarily unavailable" }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});