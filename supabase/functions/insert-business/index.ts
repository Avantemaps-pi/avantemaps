import { corsHeaders } from '../_shared/cors.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Types for incoming request body
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

// Initialize Supabase admin client
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('❌ Missing Supabase environment variables.');
}

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    // 🔐 Validate Authorization
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ success: false, error: 'Missing Authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '').trim();
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ success: false, error: 'Invalid or expired token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json() as InsertBusinessRequest;

    // ✅ Basic validation
    if (!body.owner_id || !body.businessName || body.businessTypes.length === 0) {
      return new Response(JSON.stringify({ success: false, error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ✅ Owner ID check
    if (user.id !== body.owner_id) {
      return new Response(JSON.stringify({ success: false, error: 'Forbidden: Owner ID mismatch' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ✅ Get user's subscription tier
    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .select('subscription')
      .eq('id', user.id)
      .single();

    if (userError) {
      return new Response(JSON.stringify({ success: false, error: 'Failed to validate user subscription' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ✅ Check current number of businesses
    const { count: businessCount, error: countError } = await supabaseAdmin
      .from('businesses')
      .select('*', { count: 'exact', head: true })
      .eq('owner_id', user.id);

    if (countError) {
      return new Response(JSON.stringify({ success: false, error: 'Error checking business count' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Define plan limits
    const limits: Record<string, number> = {
      individual: 1,
      'small-business': 3,
      organization: 5,
    };

    const subscription = userData?.subscription || 'individual';
    const limit = limits[subscription] || 1;

    if ((businessCount || 0) >= limit) {
      return new Response(JSON.stringify({
        success: false,
        error: `Business limit reached (${limit}). Upgrade your ${subscription} plan.`,
      }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ✅ Insert business
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
        city: body.address.city,
        state: body.address.state,
        postal_code: body.address.zipCode,
        country: body.address.country,
        coordinates: JSON.stringify({ lat: body.address.lat, lng: body.address.lng }),
        pi_wallet_address: body.piWalletAddress,
      })
      .select()
      .single();

    if (error) {
      return new Response(JSON.stringify({ success: false, error: 'Failed to insert business', details: error.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true, business: data }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err: any) {
    return new Response(JSON.stringify({
      success: false,
      error: 'Internal server error',
      details: err.message,
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
