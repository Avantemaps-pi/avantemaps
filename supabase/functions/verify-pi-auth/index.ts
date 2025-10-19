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
    // Get raw request body for debugging
    const rawBody = await req.text();
    console.log('Raw request body received:', rawBody.substring(0, 100));

    // Try to parse the request body
    let parsedBody: VerifyAuthRequest;
    try {
      parsedBody = JSON.parse(rawBody);
    } catch (parseError) {
      console.error('Failed to parse request body as JSON:', parseError);
      console.error('Body starts with:', rawBody.substring(0, 50));
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
      return new Response(
        JSON.stringify({
          error: 'Missing required fields',
          details: 'accessToken, uid, and username are required',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log(`Verifying Pi Network authentication for user: ${username} (${uid})`);

    try {
      // Optional: include your Pi Developer API key (set in Supabase environment variables)
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
        console.error(`Pi API verification failed: ${verifyResponse.status} - ${rawResponse}`);

        if (verifyResponse.status === 401) {
          return new Response(
            JSON.stringify({
              error: 'Invalid or expired access token',
              verified: false,
              details:
                'The Pi Network access token is invalid or has expired. Please try authenticating again.',
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
            details: `Unable to verify with Pi Network API. Status: ${verifyResponse.status}`,
          }),
          {
            status: 502,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      let piUserData: any;
      try {
        piUserData = JSON.parse(rawResponse);
      } catch (parseError) {
        console.error('Failed to parse Pi API response:', rawResponse);
        return new Response(
          JSON.stringify({
            error: 'Malformed Pi Network response',
            verified: false,
            details:
              'Could not parse the Pi API response. This may be a temporary issue. Please try again.',
          }),
          {
            status: 502,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      // Handle both possible response shapes: { uid, username } or { user: { uid, username } }
      const user = piUserData.user ?? piUserData;

      console.log('Pi API user response:', JSON.stringify(user, null, 2));

      if (user.uid !== uid || user.username !== username) {
        console.error('User data mismatch:', {
          expected: { uid, username },
          received: { uid: user.uid, username: user.username },
        });

        return new Response(
          JSON.stringify({
            error: 'User data verification failed',
            verified: false,
            details:
              'The user information provided does not match Pi Network records. Ensure you are signed in with the same Pi account.',
          }),
          {
            status: 403,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      console.log(`✅ Pi Network authentication verified successfully for user: ${username}`);

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
    } catch (fetchError) {
      console.error('Network error contacting Pi API:', fetchError);

      return new Response(
        JSON.stringify({
          error: 'Network error',
          verified: false,
          details:
            'Unable to connect to Pi Network API. Please check your internet connection and try again.',
        }),
        {
          status: 503,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }
  } catch (error) {
    console.error('Error in verify-pi-auth function:', error);

    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        verified: false,
        details: error instanceof Error ? error.message : 'An unexpected error occurred',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
