import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';
import { checkRateLimit, getClientIP, createRateLimitResponse } from '../_shared/rateLimit.ts';
import { verifyCronRequest } from '../_shared/cronAuth.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface OKXResponse {
  code: string;
  data: Array<{
    last: string;
  }>;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Rate limiting: 5 requests per minute for price updates (protects against abuse)
  const clientIP = getClientIP(req);
  const rateLimitCheck = checkRateLimit(clientIP, { windowMs: 60000, maxRequests: 5 });
  
  if (!rateLimitCheck.allowed) {
    console.warn(`Rate limit exceeded for price update from IP: ${clientIP}`);
    return createRateLimitResponse(rateLimitCheck.retryAfter!, undefined, corsHeaders);
  }

  try {
    console.log('Starting Pi price update...');

    // Fetch current Pi price from OKX API
    const response = await fetch('https://www.okx.com/api/v5/market/ticker?instId=PI-USDT');
    const data: OKXResponse = await response.json();

    if (data.code !== '0' || !data.data || !data.data[0]) {
      throw new Error('Invalid OKX API response');
    }

    const piPriceUsd = parseFloat(data.data[0].last);
    console.log(`Fetched Pi price: $${piPriceUsd}`);

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Update the price in the database
    const { error } = await supabaseClient
      .from('pi_price')
      .update({ 
        price_usd: piPriceUsd,
        updated_at: new Date().toISOString()
      })
      .eq('id', 1);

    if (error) {
      throw error;
    }

    console.log('Successfully updated Pi price in database');

    return new Response(
      JSON.stringify({ 
        success: true, 
        price: piPriceUsd,
        updated_at: new Date().toISOString()
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error: unknown) {
    console.error('Error updating Pi price:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        success: false 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
