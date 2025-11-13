import { corsHeaders } from '../_shared/cors.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import type { BusinessInsertPayload } from '../../../shared/types/business';

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
    const body: BusinessInsertPayload = await req.json();

    // ✅ SECURITY: Validate authentication token
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Unauthorized: Missing authentication',
        traceId,
      }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      console.error(`[${traceId}] Auth validation failed:`, authError);
      return new Response(JSON.stringify({
        success: false,
        error: 'Unauthorized: Invalid token',
        traceId,
      }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // ✅ SECURITY: Ensure owner matches token
    if (user.id !== body.user_id) {
      console.error(`[${traceId}] Owner ID mismatch. User: ${user.id}, Requested: ${body.user_id}`);
      return new Response(JSON.stringify({
        success: false,
        error: 'Forbidden: Owner ID mismatch',
        traceId,
      }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Count existing businesses
    const { count: businessCount, error: countError } = await supabaseAdmin
      .from('businesses')
      .select('*', { count: 'exact', head: true })
      .eq('owner_id', user.id);

    if (countError) {
      console.error(`[${traceId}] Error counting businesses:`, countError);
      return new Response(JSON.stringify({
        success: false,
        error: 'Error checking business limit',
        traceId,
      }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Business limits per subscription
    const BUSINESS_LIMITS: Record<string, number> = {
      'individual': 1,
      'small-business': 3,
      'organization': 5,
    };

    const limit = BUSINESS_LIMITS[body.subscription] || 1;
    const currentCount = businessCount || 0;

    if (currentCount >= limit) {
      return new Response(JSON.stringify({
        success: false,
        error: `Business limit reached. Your ${body.subscription} plan allows up to ${limit} business${limit > 1 ? 'es' : ''}.`,
        traceId,
      }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Insert business using service role (bypasses RLS)
    const { data, error } = await supabaseAdmin
      .from('businesses')
      .insert({
        owner_id: body.user_id,
        name: body.business_name,
        description: body.business_description || null,
        category: body.business_types[0] || 'Other',
        business_types: body.business_types,
        contact_info: {
          first_name: body.owner.first_name,
          last_name: body.owner.last_name,
          email: body.contact_email,
          phone: body.phone_number,
          website: body.website,
        },
        street_address: body.address.street,
        apartment: body.address.apartment,
        city: body.address.city,
        state: body.address.state,
        postal_code: body.address.zip_code,
        country: body.address.country,
        coordinates: JSON.stringify({ lat: body.address.lat || null, lng: body.address.lng || null }),
        hours: body.hours,
        pi_wallet_address: body.pi_wallet_address,
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
