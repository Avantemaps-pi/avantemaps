// Permanent insert path for pi_auth_timeout / pi_auth_resolved / pi_auth_error
// (see src/utils/telemetry/reauthTelemetry.ts, BEACON_ONLY_EVENT_TYPES).
//
// These three events fire from inside performLogin() *before*
// supabase.auth.setSession() is ever reached, at a point where the Supabase
// client structurally has no authenticated-role session — confirmed directly
// against reauth_telemetry's RLS (SET LOCAL ROLE anon → 42501, and the
// INSERT policy is `TO authenticated` only). This is true on every platform,
// not a mainnet/webview-specific issue, and has been the case since these
// event types were added. The normal client-side insert() can never succeed
// for these three, so they route here exclusively instead.
//
// Accepts a POST from navigator.sendBeacon() (which cannot set an
// Authorization header, so this must stay verify_jwt = false — see
// supabase/config.toml) and inserts a row into reauth_telemetry using the
// service role key, deliberately bypassing RLS for this narrow, validated
// path. The existing RLS policy on reauth_telemetry itself is untouched.
//
// Only accepts the three event types above — this is not a general-purpose
// anonymous insert endpoint for the table — and always stamps
// metadata.via = "beacon" server-side (regardless of what the caller sends)
// so beacon-sourced rows are identifiable for data-provenance purposes:
//   select * from reauth_telemetry where metadata->>'via' = 'beacon'
//   order by created_at desc;
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { checkRateLimit, createRateLimitResponse, getClientIP } from '../_shared/rateLimit.ts';
import { corsHeaders } from '../_shared/cors.ts';

const ALLOWED_EVENT_TYPES = ['pi_auth_timeout', 'pi_auth_resolved', 'pi_auth_error'] as const;
type AllowedEventType = (typeof ALLOWED_EVENT_TYPES)[number];

// Generous for this payload shape (a handful of short strings + a small
// metadata object) — real bodies are well under 2KB. Rejects abuse attempts
// before they ever reach JSON.parse.
const MAX_BODY_BYTES = 20_000;

const truncate = (value: unknown, maxLen: number): string | null => {
  if (value === null || value === undefined) return null;
  const str = String(value);
  return str.length > maxLen ? str.slice(0, maxLen) : str;
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// auth_uid is a uuid column — reject anything that isn't shaped like one rather
// than letting a malformed value fail the whole insert.
const asUuidOrNull = (value: unknown): string | null =>
  typeof value === 'string' && UUID_RE.test(value) ? value : null;

const jsonResponse = (body: unknown, status: number): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'POST only' }, 405);
  }

  const ip = getClientIP(req);

  // Public, unauthenticated endpoint by necessity (sendBeacon can't attach a
  // JWT) using the service role internally — treat it with the scrutiny of
  // any other public unauthenticated write surface. There's no platform-level
  // per-function rate limit on Supabase Edge Functions (only generic
  // project-wide quota/DDoS protection at the edge, not something a function
  // can configure) — this in-memory per-IP check is the same hand-rolled
  // approach every other public function in this repo already uses
  // (see log-error, verify-business, etc.).
  const ipLimit = checkRateLimit(`telemetry-beacon:ip:${ip}`, { windowMs: 60_000, maxRequests: 20 });
  if (!ipLimit.allowed) {
    console.warn('telemetry-beacon rate limited (ip)', { ip });
    return createRateLimitResponse(ipLimit.retryAfter ?? 60, undefined, corsHeaders);
  }

  const contentLength = Number(req.headers.get('content-length') ?? '0');
  if (contentLength > MAX_BODY_BYTES) {
    console.warn('telemetry-beacon rejected oversized body', { ip, contentLength });
    return jsonResponse({ error: 'Payload too large' }, 413);
  }

  try {
    const rawText = await req.text();
    if (rawText.length > MAX_BODY_BYTES) {
      console.warn('telemetry-beacon rejected oversized body (no content-length header)', {
        ip,
        length: rawText.length,
      });
      return jsonResponse({ error: 'Payload too large' }, 413);
    }

    let body: unknown;
    try {
      body = JSON.parse(rawText);
    } catch {
      return jsonResponse({ error: 'Malformed JSON body' }, 400);
    }

    if (typeof body !== 'object' || body === null || Array.isArray(body)) {
      return jsonResponse({ error: 'Body must be a JSON object' }, 400);
    }
    const parsedBody = body as Record<string, unknown>;

    const eventType = parsedBody.event_type;
    if (!ALLOWED_EVENT_TYPES.includes(eventType as AllowedEventType)) {
      return jsonResponse(
        { error: `event_type must be one of: ${ALLOWED_EVENT_TYPES.join(', ')}` },
        400,
      );
    }

    // Secondary rate limit scoped to the reported local_uid, when present —
    // catches abuse from a single client cycling IPs while claiming the same
    // local_uid. local_uid is client-supplied and not cryptographically
    // verified (there's no session to verify it against, by design — see the
    // file header), so this is defense-in-depth, not an identity boundary.
    const localUid = typeof parsedBody.local_uid === 'string' ? parsedBody.local_uid : null;
    if (localUid) {
      const uidLimit = checkRateLimit(`telemetry-beacon:uid:${localUid}`, {
        windowMs: 60_000,
        maxRequests: 10,
      });
      if (!uidLimit.allowed) {
        console.warn('telemetry-beacon rate limited (local_uid)', { ip, localUid });
        return createRateLimitResponse(uidLimit.retryAfter ?? 60, undefined, corsHeaders);
      }
    }

    const rawMetadata =
      parsedBody.metadata && typeof parsedBody.metadata === 'object' && !Array.isArray(parsedBody.metadata)
        ? (parsedBody.metadata as Record<string, unknown>)
        : {};

    const payload = {
      event_type: eventType as AllowedEventType,
      business_id:
        typeof parsedBody.business_id === 'number' && Number.isFinite(parsedBody.business_id)
          ? parsedBody.business_id
          : null,
      local_uid: truncate(localUid, 200),
      auth_uid: asUuidOrNull(parsedBody.auth_uid),
      retry_reason: truncate(parsedBody.retry_reason, 200),
      is_retry: parsedBody.is_retry === true,
      message: truncate(parsedBody.message, 1000),
      // Always stamped server-side, regardless of what the client sent, so
      // beacon-sourced rows are unambiguous even if the client-side tagging
      // is ever removed or changed.
      metadata: { ...rawMetadata, via: 'beacon' },
      user_agent: truncate(parsedBody.user_agent, 500),
      url: truncate(parsedBody.url, 500),
    };

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { error } = await supabase.from('reauth_telemetry').insert(payload);

    // sendBeacon gives the caller zero visibility into success/failure — log
    // with enough context to actually triage from Supabase's function logs,
    // since this is now the *only* write path for these three event types.
    if (error) {
      console.error('telemetry-beacon: failed to insert row', {
        ip,
        eventType,
        error: error.message,
      });
      return jsonResponse({ error: 'Failed to persist telemetry' }, 500);
    }

    return jsonResponse({ success: true }, 200);
  } catch (err) {
    console.error('telemetry-beacon: unhandled error', {
      ip,
      error: err instanceof Error ? err.message : String(err),
    });
    return jsonResponse({ error: 'Internal error' }, 500);
  }
});
