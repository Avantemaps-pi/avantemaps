import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkRateLimit, createRateLimitResponse, getClientIP } from "../_shared/rateLimit.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // ✅ SECURITY: IP-based rate limit to prevent flooding error_logs
  const ip = getClientIP(req);
  const rl = checkRateLimit(`log-error:${ip}`, { windowMs: 60_000, maxRequests: 20 });
  if (!rl.allowed) {
    return createRateLimitResponse(rl.retryAfter ?? 60, undefined, corsHeaders);
  }

  try {
    const { message, stack_trace, user_agent } = await req.json();

    if (!message || typeof message !== 'string') {
      return new Response(
        JSON.stringify({ error: 'message is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Truncate to prevent abuse
    const sanitizedMessage = message.substring(0, 1000);
    const sanitizedStack = stack_trace ? String(stack_trace).substring(0, 5000) : null;
    const sanitizedUA = user_agent ? String(user_agent).substring(0, 500) : null;

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { error } = await supabase.from('error_logs').insert({
      message: sanitizedMessage,
      stack_trace: sanitizedStack,
      user_agent: sanitizedUA,
    });

    if (error) {
      console.error('Failed to insert error log:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to log error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('Edge function error:', err);
    return new Response(
      JSON.stringify({ error: 'Internal error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
