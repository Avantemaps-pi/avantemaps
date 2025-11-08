import { corsHeaders } from '../_shared/cors.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface InsertBusinessRequest {
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

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 200, headers: corsHeaders });
  const traceId = crypto.randomUUID();

  try {
    // ✅ Validate and extract user from token
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ success: false, error: 'Missing Authorization header', traceId }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) {
      console.error(`[${traceId}] Auth failed:`, authError);
      return new Response(JSON.stringify({ success: false, error: 'Unauthorized user', traceId }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json() as InsertBusinessRequest;

    if (!body.businessName || !body.businessTypes?.length) {
      return new Response(JSON.stringify({ success: false, error: 'Missing required fields', traceId }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ✅ Derive owner_id from authenticated user
    const ownerId = user.id;

    const { data, error } = await supabaseAdmin
      .from('businesses')
      .insert({
        owner_id: ownerId,
        name: body.businessName,
        description: body.businessDescription ?? null,
        category: body.businessTypes[0] ?? 'Other',
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
      .select();

    if (error) throw error;

    return new Response(JSON.stringify({ success: true, business: data?.[0] ?? null, traceId }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err: any) {
    console.error(`[${traceId}] Internal error:`, err);
    return new Response(JSON.stringify({ success: false, error: 'Internal server error', details: err.message, traceId }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
