import { corsHeaders } from '../_shared/cors.ts';

interface VerifyAuthRequest {
  accessToken: string;
  uid: string;
  username: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    // ✅ Log the start of function execution
    console.log('🚀 verify-pi-auth triggered');

    // Read the raw request body
    const rawBody = await req.text();
    console.log('📩 Raw body snippet:', rawBody.substring(0, 150));

    // Try parsing JSON
    let parsedBody: VerifyAuthRequest;
    try {
      parsedBody = JSON.parse(rawBody);
    } catch (parseError) {
      console.error('❌ Failed to parse request JSON:', parseError);
      return new Response(
        JSON.stringify({
          error: 'Invalid request format',
          details: 'Request body must be valid JSON',
          verified: false,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const { accessToken, uid, username } = parsedBody;

    if (!accessToken || !uid || !username) {
      console.warn('⚠️ Missing required fields:', { accessToken, uid, username });
      return new Response(
        JSON.stringify({
          error: 'Missing required fields',
          details: 'accessToken, uid, and username are required',
          verified: false,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

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
      console.error(`❌ Pi API verification failed: ${verifyResponse.status} - ${rawResponse}`);

      if (verifyResponse.status === 401) {
        return new Response(
          JSON.stringify({
            error: 'Invalid or expired access token',
            verified: false,
            details:
              'The Pi Network access token is invalid or has expired. Please re-authenticate in Pi Browser.',
          }),
          {
            status: 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      return new Response(
        JSON.stringify({
          error: 'Pi Network verification failed',
          verified: false,
          details: `Pi API responded with status ${verifyResponse.status}`,
        }),
        {
          status: 502,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Attempt to parse the API response
    let piUserData: any;
    try {
      piUserData = JSON.parse(rawResponse);
    } catch (parseError) {
      console.error('❌ Could not parse Pi API JSON response:', rawResponse);
      return new Response(
        JSON.stringify({
          error: 'Malformed Pi Network response',
          verified: false,
          details:
            'Unexpected response format from Pi API. Please try again later.',
        }),
        {
          status: 502,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Support both flat and nested "user" structures
    const user = piUserData.user ?? piUserData;

    console.log('✅ Pi API user response (trimmed):', JSON.stringify({
      uid: user.uid,
      username: user.username,
      wallet_address: user.wallet_address ?? 'N/A'
    }));

    // Compare UID and username
    if (user.uid !== uid || user.username !== username) {
      console.error('❌ User data mismatch:', {
        expected: { uid, username },
        received: { uid: user.uid, username: user.username },
      });

      return new Response(
        JSON.stringify({
          error: 'User data verification failed',
          verified: false,
          details:
            'The provided Pi user info does not match the token’s data. Ensure you are logged into the correct Pi account.',
        }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log(`🎉 Pi Network authentication verified successfully for ${username}`);

    return new Response(
      JSON.stringify({
        verified: true,
        user: {
          uid: user.uid,
          username: user.username,
          wallet_address: user.wallet_address || null,
        },
        message: 'Authentication verified successfully',
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('💥 Internal error in verify-pi-auth:', error);

    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        verified: false,
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
