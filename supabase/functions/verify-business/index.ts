import { corsHeaders } from '../_shared/cors.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const VERIFIER_API_KEY = Deno.env.get('BUSINESS_VERIFICATION_API_KEY')!;
const VERIFIER_URL = 'https://ulsrprpsgiatqmakluby.supabase.co/functions/v1/verify-business';

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

    // Step 1: Local ownership validation - fetch businesses
    const { data: businesses, error: fetchError } = await supabaseAdmin
      .from('businesses')
      .select('id, owner_id, business_name, pi_wallet_address')
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

    // Step 2: Set status to pending while blockchain verification runs
    await supabaseAdmin
      .from('businesses')
      .update({ verification_status: 'pending' })
      .in('id', idsToVerify);

    // Step 3: Call external blockchain verifier for each business
    const results = [];
    for (const biz of businesses) {
      if (!biz.pi_wallet_address) {
        console.warn(`[${traceId}] Business ${biz.id} (${biz.business_name}) has no Pi wallet address`);
        results.push({
          id: biz.id,
          name: biz.business_name,
          verified: false,
          reason: 'No Pi wallet address registered for this business',
        });
        continue;
      }

      console.log(`[${traceId}] Calling external verifier for business ${biz.id} wallet ${biz.pi_wallet_address}`);

      try {
        const verifierResponse = await fetch(VERIFIER_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': VERIFIER_API_KEY,
          },
          body: JSON.stringify({
            walletAddress: biz.pi_wallet_address,
            businessName: biz.business_name,
            externalUserId: user.id,
            forceRefresh: false,
            minTransactions: 100,
            minUniqueWallets: 10,
            minCreditedTransactions: 50,
          }),
        });

        const verifierResult = await verifierResponse.json();
        console.log(`[${traceId}] Verifier response for business ${biz.id}:`, JSON.stringify(verifierResult));

        if (!verifierResult.success) {
          results.push({
            id: biz.id,
            name: biz.business_name,
            verified: false,
            reason: verifierResult.error || 'External verification failed',
          });
          continue;
        }

        const { data: vData } = verifierResult;
        const meetsRequirements = vData?.meetsRequirements === true;

        results.push({
          id: biz.id,
          name: biz.business_name,
          verified: meetsRequirements,
          reason: meetsRequirements ? null : (vData?.failureReason || 'Does not meet blockchain transaction requirements'),
          totalTransactions: vData?.totalTransactions,
          uniqueWallets: vData?.uniqueWallets,
          verificationStatus: vData?.verificationStatus,
        });
      } catch (verifierError: any) {
        console.error(`[${traceId}] External verifier error for business ${biz.id}:`, verifierError);
        results.push({
          id: biz.id,
          name: biz.business_name,
          verified: false,
          reason: 'Blockchain verification service unavailable. Please try again later.',
        });
      }
    }

    // Step 4: Update business records based on verification results
    const updateField = verification_type === 'certification' ? 'is_certified' : 'is_verified';
    const statusValue = verification_type === 'certification' ? 'certified' : 'verified';

    for (const result of results) {
      if (result.verified) {
        await supabaseAdmin
          .from('businesses')
          .update({
            [updateField]: true,
            verification_status: statusValue,
          })
          .eq('id', result.id);
      } else {
        // Reset to null (not verified) if blockchain check failed
        await supabaseAdmin
          .from('businesses')
          .update({ verification_status: null })
          .eq('id', result.id);
      }
    }

    const allVerified = results.every(r => r.verified);
    const someVerified = results.some(r => r.verified);

    console.log(`[${traceId}] Verification complete: ${results.filter(r => r.verified).length}/${results.length} passed`);

    return new Response(
      JSON.stringify({
        success: true,
        allVerified,
        someVerified,
        results,
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
