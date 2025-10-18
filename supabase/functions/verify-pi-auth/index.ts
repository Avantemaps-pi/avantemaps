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
    const { accessToken, uid, username }: VerifyAuthRequest = await req.json();

    if (!accessToken || !uid || !username) {
      return new Response(
        JSON.stringify({
          error: 'Missing required fields',
          details: 'accessToken, uid, and username are required'
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log(`Verifying Pi Network authentication for user: ${username} (${uid})`);

    try {
      const verifyResponse = await fetch('https://api.minepi.com/v2/me', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!verifyResponse.ok) {
        const errorText = await verifyResponse.text();
        console.error(`Pi API verification failed: ${verifyResponse.status} - ${errorText}`);

        if (verifyResponse.status === 401) {
          return new Response(
            JSON.stringify({
              error: 'Invalid or expired access token',
              verified: false,
              details: 'The Pi Network access token is invalid or has expired. Please try authenticating again.'
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
            details: `Unable to verify with Pi Network API. Status: ${verifyResponse.status}`
          }),
          {
            status: 502,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      const piUserData = await verifyResponse.json();

      if (piUserData.uid !== uid || piUserData.username !== username) {
        console.error('User data mismatch:', {
          expected: { uid, username },
          received: { uid: piUserData.uid, username: piUserData.username }
        });

        return new Response(
          JSON.stringify({
            error: 'User data verification failed',
            verified: false,
            details: 'The user information provided does not match Pi Network records.'
          }),
          {
            status: 403,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      console.log(`Pi Network authentication verified successfully for user: ${username}`);

      return new Response(
        JSON.stringify({
          verified: true,
          user: {
            uid: piUserData.uid,
            username: piUserData.username,
            wallet_address: piUserData.wallet_address,
          },
          message: 'Authentication verified successfully'
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
          details: 'Unable to connect to Pi Network API. Please check your internet connection and try again.'
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
        details: error instanceof Error ? error.message : 'An unexpected error occurred'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
