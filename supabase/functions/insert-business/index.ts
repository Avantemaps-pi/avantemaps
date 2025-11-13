import { corsHeaders } from '../_shared/cors.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// -----------------------------
// ✅ Types
// -----------------------------
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
  addressComponents?: Record<string, any>;
}

// -----------------------------
// ✅ Secure Supabase Admin Client
// -----------------------------
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing Supabase environment variables.');
  throw new Error('Missing Supabase credentials');
}

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// -----------------------------
// ✅ Edge Function Handler
// -----------------------------
Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const traceId = crypto.randomUUID();

  try {
    // -----------------------------
    // ✅ Auth Token Validation
    // -----------------------------
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Unauthorized: Missing or invalid Authorization header',
          traceId,
        }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const token = authHeader.replace('Bearer ', '').trim();

    const {
      data: { user },
      error: authError,
    } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      console.error(`[${traceId}] Auth validation failed:`, authError);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Unauthorized: Invalid token',
          traceId,
        }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // -----------------------------
    // ✅ Parse and Validate Request
    // -----------------------------
    const body = (await req.json()) as InsertBusinessRequest;

    if (!body.owner_id || !body.businessName || !body.businessTypes?.length) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Missing required fields',
          traceId,
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // ✅ Ensure user owns this data
    if (user.id !== body.owner_id) {
      console.error(`[${traceId}] Owner ID mismatch. User: ${user.id}, Requested: ${body.owner_id}`);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Forbidden: Owner ID mismatch',
          traceId,
        }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // -----------------------------
    // ✅ Subscription Tier Validation
    // -----------------------------
    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .select('subscription')
      .eq('id', user.id)
      .single();

    if (userError) {
      console.error(`[${traceId}] Error fetching user:`, userError);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Error validating user subscription',
          traceId,
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const { count: businessCount, error: countError } = await supabaseAdmin
      .from('businesses')
      .select('*', { count: 'exact', head: true })
      .eq('owner_id', user.id);

    if (countError) {
      console.error(`[${traceId}] Error counting businesses:`, countError);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Error checking business limit',
          traceId,
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const BUSINESS_LIMITS: Record<string, number> = {
      individual: 1,
      'small-business': 3,
      organization: 5,
    };

    const subscription = userData?.subscription || 'individual';
    const limit = BUSINESS_LIMITS[subscription] || 1;
    const currentCount = businessCount || 0;

    if (currentCount >= limit) {
      console.log(
        `[${traceId}] Business limit reached. Tier: ${subscription}, Count: ${currentCount}, Limit: ${limit}`,
      );
      return new Response(
        JSON.stringify({
          success: false,
          error: `Business limit reached. Your ${subscription} plan allows up to ${limit} business${limit > 1 ? 'es' : ''}.`,
          traceId,
        }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // -----------------------------
    // ✅ Insert Business Record
    // -----------------------------
    const { data, error } = await supabaseAdmin
      .from('businesses')
      .insert({
        owner_id: body.owner_id,
        business_name: body.businessName,
        business_description: body.businessDescription || null,
        category: body.businessTypes[0] || 'Other',
        business_types: body.businessTypes,
        contact_info: body.contact,
        street_address: body.address.streetAddress,
        city: body.address.city,
        state: body.address.state,
        zip_code: body.address.zipCode,
        country: body.address.country,
        lat: body.address.lat,
        lng: body.address.lng,
        pi_wallet_address: body.piWalletAddress,
        address_components: body.addressComponents || {},
        is_verified: false,
        is_certified: false,
        verification_status: 'pending',
      })
      .select()
      .single();

    if (error) {
      console.error(`[${traceId}] Insert error:`, error);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Failed to insert business',
          details: error.message,
          traceId,
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // -----------------------------
    // ✅ Return Success Response
    // -----------------------------
    return new Response(
      JSON.stringify({
        success: true,
        business: data,
        traceId,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err: any) {
    console.error(`[${traceId}] Internal error:`, err);
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Internal server error',
        details: err.message,
        traceId,
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
