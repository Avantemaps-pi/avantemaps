// TEMPORARY DIAGNOSTIC ENDPOINT — safe to remove once the "does Pi Browser's
// mainnet webview silently block fetch() to Supabase?" question is answered.
//
// Accepts a POST from navigator.sendBeacon() (which cannot set an Authorization
// header, so this must stay verify_jwt = false — see supabase/config.toml) and
// inserts a row into reauth_telemetry using the service role key, bypassing RLS.
// This is necessary regardless of the webview theory: the anon role is flatly
// rejected by reauth_telemetry's existing INSERT policy (confirmed via a direct
// RLS test), since pi_auth_timeout/pi_auth_resolved can fire before any Supabase
// auth session exists. The existing RLS policy on reauth_telemetry is untouched —
// this function does not loosen it, it is a separate, narrowly-scoped path.
//
// Only accepts the three event types this diagnostic cares about, and always
// stamps metadata.via = "beacon_fallback" server-side (regardless of what the
// caller sends) so beacon-sourced rows are unambiguous in analysis:
//   select * from reauth_telemetry where metadata->>'via' = 'beacon_fallback'
//   order by created_at desc;
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkRateLimit, createRateLimitResponse, getClientIP } from "../_shared/rateLimit.ts";
import { corsHeaders } from "../_shared/cors.ts";

const ALLOWED_EVENT_TYPES = ["pi_auth_timeout", "pi_auth_resolved", "pi_auth_error"] as const;
type AllowedEventType = (typeof ALLOWED_EVENT_TYPES)[number];

const truncate = (value: unknown, maxLen: number): string | null => {
  if (value === null || value === undefined) return null;
  const str = String(value);
  return str.length > maxLen ? str.slice(0, maxLen) : str;
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// auth_uid is a uuid column — reject anything that isn't shaped like one rather
// than letting a malformed value fail the whole insert.
const asUuidOrNull = (value: unknown): string | null =>
  typeof value === "string" && UUID_RE.test(value) ? value : null;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "POST only" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Public, unauthenticated endpoint (sendBeacon can't attach a JWT) — rate
  // limit by IP to bound abuse of this diagnostic-only insert path.
  const ip = getClientIP(req);
  const rl = checkRateLimit(`telemetry-beacon:${ip}`, { windowMs: 60_000, maxRequests: 20 });
  if (!rl.allowed) {
    return createRateLimitResponse(rl.retryAfter ?? 60, undefined, corsHeaders);
  }

  try {
    const body = await req.json();

    const eventType = body?.event_type;
    if (!ALLOWED_EVENT_TYPES.includes(eventType)) {
      return new Response(
        JSON.stringify({
          error: `event_type must be one of: ${ALLOWED_EVENT_TYPES.join(", ")}`,
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const rawMetadata =
      body?.metadata && typeof body.metadata === "object" && !Array.isArray(body.metadata)
        ? body.metadata
        : {};

    const payload = {
      event_type: eventType as AllowedEventType,
      business_id:
        typeof body?.business_id === "number" && Number.isFinite(body.business_id)
          ? body.business_id
          : null,
      local_uid: truncate(body?.local_uid, 200),
      auth_uid: asUuidOrNull(body?.auth_uid),
      retry_reason: truncate(body?.retry_reason, 200),
      is_retry: body?.is_retry === true,
      message: truncate(body?.message, 1000),
      // Always stamped server-side, regardless of what the client sent, so
      // beacon-sourced rows are unambiguous even if the client-side tagging
      // is ever removed or changed.
      metadata: { ...rawMetadata, via: "beacon_fallback" },
      user_agent: truncate(body?.user_agent, 500),
      url: truncate(body?.url, 500),
    };

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { error } = await supabase.from("reauth_telemetry").insert(payload);

    if (error) {
      console.error("Failed to insert beacon telemetry:", error);
      return new Response(JSON.stringify({ error: "Failed to persist telemetry" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("telemetry-beacon error:", err);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
