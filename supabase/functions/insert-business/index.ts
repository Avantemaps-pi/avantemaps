import { corsHeaders } from '../_shared/cors.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface InsertBusinessRequest {
  owner_id: string;
  businessName: string;
  businessDescription?: string;
  businessTypes: string[];
  contact: {
    firstName: string;
    lastName: string;
    phone: string;
    email: string;
    website?: string;
  };
  address: {
    streetAddress: string;
    apartment?: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
    lat: number;
    lng: number;
  };
  piWalletAddress: string;
}

// Initialize Supabase admin client safely
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("❌ Missing Supabase environment variables.");
  throw new Error("Missing Supabase credentials");
}

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const traceId = crypto.randomUUID();

  try {
    const body = await req.json() as InsertBusinessRequest;

    // Validate required fields
    if (!body.owner_id || !body.businessName || !body.businessTypes.length) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Missing required fields',
        traceId,
      }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Insert the business using service role (bypasses RLS)
    const { data, error } = await supabaseAdmin
      .from('businesses')
      .insert({
        owner_id: body.owner_id,
        name: body.businessName,
        description: body.businessDescription || null,
        category: body.businessTypes[0] || 'Other',
        business_types: body.businessTypes,
        contact_info: body.contact,
        street_address: body.address.streetAddress,
        apartment: body.address.apartment || null,
        city: body.address.city,
        state: body.address.state,
        postal_code: body.address.zipCode,
        country: body.address.country,
        coordinates: JSON.stringify({ lat: body.address.lat, lng: body.address.lng }),
        pi_wallet_address: body.piWalletAddress,
      })
      .select();

    if (error) {
      console.error(`[${traceId}] Insert error:`, error);
      return new Response(JSON.stringify({
        success: false,
        error: 'Failed to insert business',
        details: error.message,
        traceId,
      }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({
      success: true,
      business: data?.[0] ?? null,
      traceId,
    }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (err: any) {
    console.error(`[${traceId}] Internal error:`, err);
    return new Response(JSON.stringify({
      success: false,
      error: 'Internal server error',
      details: err.message,
      traceId,
    }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});

