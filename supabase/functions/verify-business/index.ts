import { corsHeaders } from '../_shared/cors.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

interface VerifyBusinessRequest {
  business_id?: number;
  business_ids?: number[];
  verification_type?: 'verification' | 'certification';
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const traceId = crypto.randomUUID();
  console.log(`[${traceId}] verify-business: Request received`);

  try {
    // Validate authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error(`[${traceId}] Missing authorization header`);
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized: Missing authentication', traceId }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      console.error(`[${traceId}] Auth validation failed:`, authError);
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized: Invalid token', traceId }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body: VerifyBusinessRequest = await req.json();
    const { business_id, business_ids, verification_type = 'verification' } = body;

    const isBatch = Array.isArray(business_ids) && business_ids.length > 0;
    const idsToVerify = isBatch ? business_ids : (business_id ? [business_id] : []);

    if (idsToVerify.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'business_id or business_ids is required', traceId }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[${traceId}] Verifying ${idsToVerify.length} business(es) for user ${user.id}`);

    // Verify ownership of all businesses
    const { data: businesses, error: fetchError } = await supabaseAdmin
      .from('businesses')
      .select('id, owner_id, business_name')
      .in('id', idsToVerify);

    if (fetchError) {
      console.error(`[${traceId}] Error fetching businesses:`, fetchError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to fetch business details', traceId }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!businesses || businesses.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'No businesses found with the provided IDs', traceId }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check that user owns all businesses
    const unauthorizedBusinesses = businesses.filter(b => b.owner_id !== user.id);
    if (unauthorizedBusinesses.length > 0) {
      console.error(`[${traceId}] User ${user.id} does not own businesses: ${unauthorizedBusinesses.map(b => b.id).join(', ')}`);
      return new Response(
        JSON.stringify({ success: false, error: 'Forbidden: You can only verify your own businesses', traceId }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Directly update the business records
    const updateField = verification_type === 'certification' ? 'is_certified' : 'is_verified';
    const statusValue = verification_type === 'certification' ? 'certified' : 'verified';

    const { error: updateError } = await supabaseAdmin
      .from('businesses')
      .update({
        [updateField]: true,
        verification_status: statusValue
      })
      .in('id', idsToVerify);

    if (updateError) {
      console.error(`[${traceId}] Error updating verification status:`, updateError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to update verification status', traceId }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[${traceId}] Successfully verified ${idsToVerify.length} business(es)`);

    return new Response(
      JSON.stringify({
        success: true,
        message: isBatch
          ? `${idsToVerify.length} businesses verified successfully`
          : 'Business verified successfully',
        businesses: businesses.map(b => ({ id: b.id, name: b.business_name })),
        verification_type,
        traceId,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err: any) {
    console.error(`[${traceId}] Internal error:`, err);
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error', details: err.message, traceId }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
