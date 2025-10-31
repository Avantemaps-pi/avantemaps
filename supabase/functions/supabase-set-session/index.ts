import { corsHeaders } from '../_shared/cors.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

/**
 * This function sets the Supabase session token returned from verify-pi-auth
 * on the client by returning a session cookie or link to be used with Supabase JS.
 */

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
    const body = await req.json();
    const { accessToken } = body;

    if (!accessToken) {
      return new Response(JSON.stringify({
        error: 'Missing accessToken in request',
        traceId,
      }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Optionally: verify token format
    if (!accessToken.includes('token=')) {
      return new Response(JSON.stringify({
        error: 'Invalid token format',
        traceId,
      }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Return token to client
    return new Response(JSON.stringify({
      accessToken,
      traceId,
    }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (err: any) {
    console.error(`💥 [${traceId}] Error setting Supabase session`, err);
    return new Response(JSON.stringify({
      error: err.message || 'Internal server error',
      traceId,
    }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
