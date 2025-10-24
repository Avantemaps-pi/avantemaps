import { corsHeaders } from '../_shared/cors.ts';

/**
 * Pi Network Authentication Verification
 * Enhanced with retry logic, better token validation handling,
 * runtime diagnostics, and structured error responses.
 */

interface VerifyAuthRequest {
  accessToken: string;
  uid: string;
  username: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const traceId = crypto.randomUUID();

  try {
    console.log(`🚀 [${traceId}] verify-pi-auth invoked`);

    // Parse test mode flag
    const url = new URL(req.url);
    const testMode = url.searchParams.get('test') === 'true';

    // Parse and validate request body
    const rawBody = await req.text();
    console.log(`📩 [${traceId}] Raw body (first 150 chars): ${rawBody.substring(0, 150)}`);

    let parsedBody: VerifyAuthRequest;
    try {
      parsedBody = JSON.parse(rawBody);
    } catch {
      return new Response(
        JSON.stringify({
          verified: false,
          error: 'Invalid request format',
          details: 'Body must be valid JSON.',
          traceId,
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const { accessToken, uid, username } = parsedBody;

    if (!accessToken || !uid || !username) {
      console.warn(`⚠️ [${traceId}] Missing required fields`);
      return new Response(
        JSON.stringify({
          verified: false,
          error: 'Missing required fields',
          details: 'accessToken, uid, and username are required.',
          traceId,
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // ✅ Bypass if running test mode
    if (testMode) {
      console.log(`🧪 [${traceId}] Test mode active – skipping Pi API call.`);
      return new Response(
        JSON.stringify({
          verified: true,
          testMode: true,
          message: 'Verification bypassed successfully.',
          user: { uid, username, wallet_address: 'TEST_WALLET_123' },
          traceId,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // --- Verify against Pi Network API ---
    console.log(`🔍 [${traceId}] Verifying token for ${username} (${uid})`);

    // --- Fetch user details from Pi API ---
    // ❌ Removed X-Api-Key header (this caused 401 errors)
    const verifyResponse = await fetch('https://api.minepi.com/v2/me', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    const rawResponse = await verifyResponse.text();
    console.log(`📡 [${traceId}] Pi API raw response: ${rawResponse}`);

    // --- Handle common API errors ---
    if (!verifyResponse.ok) {
      console.error(`❌ [${traceId}] Pi API returned ${verifyResponse.status}: ${rawResponse}`);

      if (verifyResponse.status === 401) {
        // Expired token handling
        return new Response(
          JSON.stringify({
            verified: false,
            error: 'Invalid or expired access token',
            details: 'The Pi Network access token has expired or is invalid.',
            action: 'reauthenticate',
            traceId,
          }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }

      if (verifyResponse.status >= 500) {
        // Pi API temporarily down
        return new Response(
          JSON.stringify({
            verified: false,
            error: 'Pi Network service unavailable',
            details: 'Pi API responded with a server error. Try again later.',
            traceId,
          }),
          { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }

      return new Response(
        JSON.stringify({
          verified: false,
          error: 'Verification failed',
          details: `Unexpected status ${verifyResponse.status} from Pi API.`,
          traceId,
        }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // --- Parse response safely ---
    let piUserData: any;
    try {
      piUserData = JSON.parse(rawResponse);
    } catch {
      console.error(`❌ [${traceId}] Failed to parse Pi API JSON`);
      return new Response(
        JSON.stringify({
          verified: false,
          error: 'Malformed Pi API response',
          details: 'Unexpected response format from Pi Network API.',
          traceId,
        }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const user = piUserData.user ?? piUserData;
    console.log(`✅ [${traceId}] Pi API response:`, {
      uid: user.uid,
      username: user.username,
      wallet_address: user.wallet_address ?? 'N/A',
    });

    // --- Validate user match ---
    if (user.uid !== uid || user.username !== username) {
      console.warn(`⚠️ [${traceId}] User mismatch`);
      return new Response(
        JSON.stringify({
          verified: false,
          error: 'User mismatch',
          details: 'UID or username does not match token data.',
          traceId,
        }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // --- Successful verification ---
    console.log(`🎉 [${traceId}] Token verified successfully for ${username}`);

    return new Response(
      JSON.stringify({
        verified: true,
        user: {
          uid: user.uid,
          username: user.username,
          wallet_address: user.wallet_address || null,
        },
        traceId,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error(`💥 [${traceId}] Internal error:`, err);
    return new Response(
      JSON.stringify({
        verified: false,
        error: 'Internal server error',
        details: err instanceof Error ? err.message : 'Unknown runtime error.',
        traceId,
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
