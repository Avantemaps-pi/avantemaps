import { corsHeaders } from '../_shared/cors.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

/**
 * Pi Network Authentication Verification
 * with Supabase Auth integration (fixed JWT)
 */

interface VerifyAuthRequest {
  accessToken: string;
  uid: string;
  username: string;
}

// Create Supabase Admin client (Service Role Key)
const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const traceId = crypto.randomUUID();

  try {
    console.log(`🚀 [${traceId}] verify-pi-auth invoked`);

    const url = new URL(req.url);
    const isDev = Deno.env.get('ENVIRONMENT') === 'development';
    const testMode = isDev && url.searchParams.get('test') === 'true';

    const rawBody = await req.text();
    let parsedBody: VerifyAuthRequest;

    try {
      parsedBody = JSON.parse(rawBody);
    } catch {
      return new Response(JSON.stringify({
        verified: false,
        error: 'Invalid request format',
        details: 'Body must be valid JSON.',
        traceId,
      }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { accessToken, uid, username } = parsedBody;

    if (!accessToken || !uid || !username) {
      return new Response(JSON.stringify({
        verified: false,
        error: 'Missing required fields',
        details: 'accessToken, uid, and username are required.',
        traceId,
      }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // ✅ Test mode (no API call)
    if (testMode) {
      return new Response(JSON.stringify({
        verified: true,
        testMode: true,
        message: 'Verification bypassed (development mode).',
        user: { uid, username, wallet_address: 'TEST_WALLET_123' },
        traceId,
      }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // --- Verify token with Pi API ---
    const verifyResponse = await fetch('https://api.minepi.com/v2/me', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    const rawResponse = await verifyResponse.text();

    if (!verifyResponse.ok) {
      return new Response(JSON.stringify({
        verified: false,
        error: 'Pi API verification failed',
        details: rawResponse,
        traceId,
      }), { status: verifyResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const piUserData = JSON.parse(rawResponse);
    const user = piUserData.user ?? piUserData;

    if (user.uid !== uid || user.username !== username) {
      return new Response(JSON.stringify({
        verified: false,
        error: 'User mismatch',
        details: 'UID or username does not match token data.',
        traceId,
      }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // --- Supabase Auth Integration ---
    const email = `${username}@pi.local`;

    const { data: usersList } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = usersList?.users.find((u) => u.id === uid);

    if (!existingUser) {
      await supabaseAdmin.auth.admin.createUser({
        id: uid,
        email,
        email_confirm: true,
        user_metadata: { username },
      });
      console.log(`✅ [${traceId}] Created new Supabase user ${uid}`);
    }

    // --- FIX: generate proper JWT with `sub` claim ---
    const jwt = await supabaseAdmin.auth.admin.generateUserAccessToken(uid);

    return new Response(JSON.stringify({
      verified: true,
      user: {
        uid: user.uid,
        username: user.username,
        wallet_address: user.wallet_address || null,
      },
      supabase_token: jwt.access_token, // valid token with `sub`
      traceId,
    }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (err) {
    console.error(`💥 [${traceId}] Internal error:`, err);
    return new Response(JSON.stringify({
      verified: false,
      error: 'Internal server error',
      details: err instanceof Error ? err.message : 'Unknown runtime error.',
      traceId,
    }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
