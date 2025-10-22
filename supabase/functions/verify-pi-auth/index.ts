import { corsHeaders } from '../_shared/cors.ts';

interface VerifyAuthRequest {
  accessToken: string;
  uid: string;
  username: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    console.log('🚀 verify-pi-auth triggered');
    
    const traceId = crypto.randomUUID();
    console.log(`🧭 Trace ID: ${traceId} | Incoming verification request`);

    const url = new URL(req.url);
    const testMode = url.searchParams.get('test') === 'true';
    console.log('🧩 Test mode:', testMode);

    const rawBody = await req.text();
    console.log('📩 Raw body snippet:', rawBody.substring(0, 150));

    let parsedBody: VerifyAuthRequest;
    try {
      parsedBody = JSON.parse(rawBody);
    } catch (parseError) {
      console.error('❌ Failed to parse JSON body:', parseError);
      return new Response(
        JSON.stringify({
          error: 'Invalid request format',
          verified: false,
          details: 'Request body must be valid JSON',
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const { accessToken, uid, username } = parsedBody;

    if (!accessToken || !uid || !username) {
      console.warn('⚠️ Missing fields:', { accessToken, uid, username });
      return new Response(
        JSON.stringify({
          error: 'Missing required fields',
          verified: false,
          details: 'accessToken, uid, and username are required',
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // ✅ Test mode bypass
    if (testMode) {
      console.log('🧪 Running in TEST MODE — skipping Pi API verification');
      return new Response(
        JSON.stringify({
          verified: true,
          message: 'Test mode successful — no external call made.',
          user: { uid, username, wallet_address: 'TEST_WALLET_123' },
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // --- Normal Pi verification below ---
    console.log(`🔍 Verifying Pi Network authentication for: ${username} (${uid})`);

    const piApiKey = Deno.env.get('PI_API_KEY') || '';

    const verifyResponse = await fetch('https://api.minepi.com/v2/me', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        ...(piApiKey ? { 'X-Api-Key': piApiKey } : {}),
      },
    });

    const rawResponse = await verifyResponse.text();

      if (!verifyResponse.ok) {
    console.error(`❌ [${traceId}] Pi API verification failed: ${verifyResponse.status} - ${rawResponse}`);
  
      if (verifyResponse.status === 401) {
        console.warn(`⚠️ [${traceId}] Access token expired. Recommend frontend to reauthenticate user.`);
        return new Response(
          JSON.stringify({
            error: 'Invalid or expired access token',
            verified: false,
            details: 'The Pi Network access token is invalid or has expired.',
            traceId,
            action: 'reauthenticate',
          }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }

      return new Response(
        JSON.stringify({
          error: 'Pi Network verification failed',
          verified: false,
          details: `Pi API responded with status ${verifyResponse.status}`,
        }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    let piUserData: any;
    try {
      piUserData = JSON.parse(rawResponse);
    } catch {
      console.error('❌ Failed to parse Pi API JSON:', rawResponse);
      return new Response(
        JSON.stringify({
          error: 'Malformed Pi Network response',
          verified: false,
          details: 'Unexpected format from Pi API.',
        }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const user = piUserData.user ?? piUserData;

    console.log('✅ Pi API user response:', {
      uid: user.uid,
      username: user.username,
      wallet_address: user.wallet_address ?? 'N/A',
    });

    console.log(`✅ [${traceId}] Access token validated successfully — user matches Pi API.`);

    if (user.uid !== uid || user.username !== username) {
      console.error('❌ User mismatch:', { expected: { uid, username }, got: user });
      return new Response(
        JSON.stringify({
          error: 'User data mismatch',
          verified: false,
          details: 'UID/username do not match token data.',
        }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    console.log(`🎉 Verified successfully for ${username}`);

      return new Response(
    JSON.stringify({
      verified: true,
      user: { uid: user.uid, username: user.username, wallet_address: user.wallet_address || null },
      traceId,
    }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    console.error('💥 Internal error in verify-pi-auth:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        verified: false,
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
