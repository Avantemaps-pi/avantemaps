import { corsHeaders } from '../_shared/cors.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Pi Network Horizon API (Stellar-based)
const PI_HORIZON_URL = 'https://api.mainnet.minepi.com';

// Verification thresholds
const MIN_TRANSACTIONS = 100;
const MIN_UNIQUE_WALLETS = 10;
const MIN_CREDITED_TRANSACTIONS = 50;

interface VerifyBusinessRequest {
  business_id?: number;
  business_ids?: number[];
  verification_type?: 'verification' | 'certification';
}

interface BlockchainVerificationResult {
  meetsRequirements: boolean;
  totalTransactions: number;
  uniqueWallets: number;
  creditedTransactions: number;
  failureReasons: string[];
}

/**
 * Query the Pi Horizon API to verify a wallet's transaction history.
 * Uses the Stellar Horizon payments endpoint to count transactions,
 * unique counterparties, and credited (received) payments.
 */
async function verifyWalletOnChain(
  walletAddress: string,
  traceId: string
): Promise<BlockchainVerificationResult> {
  const allPayments: any[] = [];
  let cursor: string | undefined;
  const limit = 200; // max per page

  // Paginate through all payments for this account
  try {
    while (true) {
      const url = new URL(`${PI_HORIZON_URL}/accounts/${walletAddress}/payments`);
      url.searchParams.set('limit', String(limit));
      url.searchParams.set('order', 'desc');
      if (cursor) url.searchParams.set('cursor', cursor);

      const res = await fetch(url.toString(), {
        headers: { Accept: 'application/json' },
      });

      if (!res.ok) {
        if (res.status === 404) {
          console.warn(`[${traceId}] Wallet ${walletAddress} not found on Pi blockchain`);
          return {
            meetsRequirements: false,
            totalTransactions: 0,
            uniqueWallets: 0,
            creditedTransactions: 0,
            failureReasons: ['Wallet address not found on the Pi blockchain'],
          };
        }
        throw new Error(`Horizon API returned ${res.status}: ${await res.text()}`);
      }

      const json = await res.json();
      const records = json?._embedded?.records ?? [];

      if (records.length === 0) break;

      allPayments.push(...records);
      cursor = records[records.length - 1].paging_token;

      // Safety cap – avoid runaway pagination
      if (allPayments.length >= 5000) break;

      // If fewer results than limit, we've reached the end
      if (records.length < limit) break;
    }
  } catch (err: any) {
    console.error(`[${traceId}] Horizon API error for ${walletAddress}:`, err);
    throw err;
  }

  console.log(`[${traceId}] Fetched ${allPayments.length} payment records for ${walletAddress}`);

  // Analyse payments
  const uniqueWalletSet = new Set<string>();
  let creditedTransactions = 0;

  for (const p of allPayments) {
    // payment types: create_account, payment, path_payment_strict_receive, etc.
    const from = p.from ?? p.source_account;
    const to = p.to;

    if (from && from !== walletAddress) uniqueWalletSet.add(from);
    if (to && to !== walletAddress) uniqueWalletSet.add(to);

    // Credited = money received by this wallet
    if (to === walletAddress) creditedTransactions++;
    // create_account where the wallet is the target is also credited
    if (p.type === 'create_account' && p.account === walletAddress) creditedTransactions++;
  }

  const totalTransactions = allPayments.length;
  const uniqueWallets = uniqueWalletSet.size;

  const failureReasons: string[] = [];
  if (totalTransactions < MIN_TRANSACTIONS)
    failureReasons.push(`Only ${totalTransactions} transactions (need ${MIN_TRANSACTIONS}+)`);
  if (uniqueWallets < MIN_UNIQUE_WALLETS)
    failureReasons.push(`Only ${uniqueWallets} unique wallets (need ${MIN_UNIQUE_WALLETS}+)`);
  if (creditedTransactions < MIN_CREDITED_TRANSACTIONS)
    failureReasons.push(`Only ${creditedTransactions} credited transactions (need ${MIN_CREDITED_TRANSACTIONS}+)`);

  return {
    meetsRequirements: failureReasons.length === 0,
    totalTransactions,
    uniqueWallets,
    creditedTransactions,
    failureReasons,
  };
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

    // Fetch businesses and validate ownership
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

    // Check ownership
    const unauthorizedBusinesses = businesses.filter(b => b.owner_id !== user.id);
    if (unauthorizedBusinesses.length > 0) {
      console.error(`[${traceId}] User ${user.id} does not own businesses: ${unauthorizedBusinesses.map(b => b.id).join(', ')}`);
      return new Response(
        JSON.stringify({ success: false, error: 'Forbidden: You can only verify your own businesses', traceId }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Set status to pending while blockchain verification runs
    await supabaseAdmin
      .from('businesses')
      .update({ verification_status: 'pending' })
      .in('id', idsToVerify);

    // Verify each business against the Pi blockchain
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

      try {
        console.log(`[${traceId}] Checking blockchain for wallet ${biz.pi_wallet_address}`);
        const verification = await verifyWalletOnChain(biz.pi_wallet_address, traceId);

        console.log(`[${traceId}] Business ${biz.id} blockchain result:`, JSON.stringify(verification));

        results.push({
          id: biz.id,
          name: biz.business_name,
          verified: verification.meetsRequirements,
          reason: verification.meetsRequirements
            ? null
            : verification.failureReasons.join('; '),
          totalTransactions: verification.totalTransactions,
          uniqueWallets: verification.uniqueWallets,
          creditedTransactions: verification.creditedTransactions,
        });
      } catch (err: any) {
        console.error(`[${traceId}] Blockchain verification error for business ${biz.id}:`, err);
        results.push({
          id: biz.id,
          name: biz.business_name,
          verified: false,
          reason: 'Blockchain verification service unavailable. Please try again later.',
        });
      }
    }

    // Update business records based on results
    const updateField = verification_type === 'certification' ? 'is_certified' : 'is_verified';
    const statusValue = verification_type === 'certification' ? 'certified' : 'verified';

    for (const result of results) {
      if (result.verified) {
        await supabaseAdmin
          .from('businesses')
          .update({ [updateField]: true, verification_status: statusValue })
          .eq('id', result.id);
      } else {
        await supabaseAdmin
          .from('businesses')
          .update({ verification_status: null })
          .eq('id', result.id);
      }
    }

    const allVerified = results.every(r => r.verified);

    console.log(`[${traceId}] Verification complete: ${results.filter(r => r.verified).length}/${results.length} passed`);

    return new Response(
      JSON.stringify({
        success: true,
        allVerified,
        someVerified: results.some(r => r.verified),
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
