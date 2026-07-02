import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { checkRateLimit, createRateLimitResponse, getClientIP } from "../_shared/rateLimit.ts";

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // ✅ SECURITY: rate-limit anonymous analytics writes to prevent view-count inflation
  const ip = getClientIP(req);
  const rl = checkRateLimit(`log-business-view:${ip}`, { windowMs: 60_000, maxRequests: 30 });
  if (!rl.allowed) {
    return createRateLimitResponse(rl.retryAfter ?? 60, undefined, corsHeaders);
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request body
    const { business_id } = await req.json();

    if (!business_id) {
      return new Response(
        JSON.stringify({ error: "business_id is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    // ✅ Validate the business_id exists before inserting a view record
    const { data: exists, error: existsErr } = await supabase
      .from('businesses')
      .select('id')
      .eq('id', parseInt(business_id))
      .maybeSingle();
    if (existsErr || !exists) {
      return new Response(
        JSON.stringify({ error: "Invalid business_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get user from auth header (optional - views can be anonymous)
    let userId: string | null = null;
    const authHeader = req.headers.get("Authorization");
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data: { user } } = await supabase.auth.getUser(token);
      userId = user?.id || null;
    }

    // Get user agent and referrer for analytics
    const userAgent = req.headers.get("user-agent") || null;
    const referrer = req.headers.get("referer") || null;

    // Insert the view record
    const { error } = await supabase
      .from("business_views")
      .insert({
        business_id: parseInt(business_id),
        user_id: userId,
        user_agent: userAgent,
        referrer: referrer,
      });

    if (error) {
      console.error("Error logging view:", error);
      return new Response(
        JSON.stringify({ error: "Failed to log view" }),
        { 
          status: 500, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    return new Response(
      JSON.stringify({ success: true }),
      { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
