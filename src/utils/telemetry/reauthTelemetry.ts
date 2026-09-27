import { supabase } from '@/integrations/supabase/client';
import { getSupabaseFunctionsUrl } from '@/config/supabase';

export type ReauthEventType =
  | 'reauth_triggered'
  | 'reauth_failed'
  | 'reauth_retry_exhausted'
  | 'pi_auth_timeout'
  | 'pi_auth_resolved'
  | 'pi_auth_error';

export interface ReauthEventContext {
  businessId?: number | null;
  localUid?: string | null;
  authUid?: string | null;
  retryReason?: string | null;
  isRetry?: boolean;
  message?: string | null;
  metadata?: Record<string, unknown>;
}

// pi_auth_timeout / pi_auth_resolved / pi_auth_error all fire from inside
// performLogin() *before* supabase.auth.setSession() is ever reached (the
// timeout fires before authPromise resolves; the resolve/reject handlers fire
// before backend verification even starts) — and performLogin() is only ever
// entered when no valid Supabase session already exists (AuthProvider's mount
// effect restores the user directly and skips performLogin() whenever
// supabase.auth.getSession() finds one). So the Supabase client has no
// authenticated-role session at the moment these three events record, on any
// platform, every time. reauth_telemetry's INSERT policy is `TO authenticated`
// only (confirmed directly: SET LOCAL ROLE anon → 42501), so the normal
// fetch-based insert() below structurally cannot succeed for these three event
// types — this is not a mainnet/webview issue, it is true everywhere and has
// been since PR #72. They route exclusively through
// supabase/functions/telemetry-beacon instead, which inserts with the service
// role key (bypassing RLS). Sent via keepalive fetch(), falling back to
// navigator.sendBeacon() (no session/JWT needed on either path).
// metadata.via is 'beacon-fetch' / 'beacon-sendbeacon' (or plain 'beacon' for
// rows from older clients). Query beacon-sourced rows via:
//   select * from reauth_telemetry where metadata->>'via' like 'beacon%'
//   order by created_at desc;
const BEACON_ENDPOINT_URL = `${getSupabaseFunctionsUrl()}/telemetry-beacon`;
const BEACON_ONLY_EVENT_TYPES = new Set<ReauthEventType>([
  'pi_auth_timeout',
  'pi_auth_resolved',
  'pi_auth_error',
]);

const safeMetadata = (
  ctx: ReauthEventContext,
  err?: unknown,
): Record<string, unknown> => {
  const meta: Record<string, unknown> = { ...(ctx.metadata ?? {}) };
  if (err) {
    if (err instanceof Error) {
      meta['error'] = { name: err.name, message: err.message, stack: err.stack };
    } else {
      try {
        meta['error'] = JSON.parse(JSON.stringify(err));
      } catch {
        meta['error'] = String(err);
      }
    }
  }
  return meta;
};

// text/plain + credentials: 'omit' makes this a CORS "simple" request, so no
// preflight is needed on any browser (telemetry-beacon parses the raw text as
// JSON regardless of Content-Type). keepalive lets the request outlive a page
// unload the same way sendBeacon does. `via` records which transport
// delivered the row; the edge function copies it into metadata.via.
const BEACON_CONTENT_TYPE = 'text/plain;charset=UTF-8';

const sendViaSendBeacon = (
  eventType: ReauthEventType,
  payload: Record<string, unknown>,
): void => {
  if (typeof navigator === 'undefined' || typeof navigator.sendBeacon !== 'function') {
    console.warn('[telemetry] sendBeacon unavailable — beacon-only event dropped', { eventType });
    return;
  }

  try {
    // A string body is sent as text/plain;charset=UTF-8 — no preflight.
    const queued = navigator.sendBeacon(
      BEACON_ENDPOINT_URL,
      JSON.stringify({ ...payload, via: 'beacon-sendbeacon' }),
    );
    if (!queued) {
      console.warn('[telemetry] sendBeacon refused to queue beacon-only event — dropped', {
        eventType,
      });
    }
  } catch (beaconErr) {
    console.warn('[telemetry] sendBeacon threw — beacon-only event dropped', {
      eventType,
      error: beaconErr,
    });
  }
};

// Any fetch failure (missing, synchronous throw, rejected promise, non-2xx)
// falls back to sendBeacon. A request that reached the server but whose
// response was lost can produce a duplicate row; that's accepted, and the two
// rows are distinguishable by metadata.via.
const sendBeaconOnlyEvent = (
  eventType: ReauthEventType,
  payload: Record<string, unknown>,
): void => {
  if (typeof fetch !== 'function') {
    sendViaSendBeacon(eventType, payload);
    return;
  }

  try {
    void fetch(BEACON_ENDPOINT_URL, {
      method: 'POST',
      keepalive: true,
      credentials: 'omit',
      headers: { 'Content-Type': BEACON_CONTENT_TYPE },
      body: JSON.stringify({ ...payload, via: 'beacon-fetch' }),
    }).then(
      (res) => {
        if (!res.ok) {
          console.warn('[telemetry] beacon-fetch rejected by telemetry-beacon — falling back to sendBeacon', {
            eventType,
            status: res.status,
          });
          sendViaSendBeacon(eventType, payload);
        }
      },
      (fetchErr) => {
        console.warn('[telemetry] beacon-fetch request failed — falling back to sendBeacon', {
          eventType,
          error: fetchErr,
        });
        sendViaSendBeacon(eventType, payload);
      },
    );
  } catch (fetchErr) {
    console.warn('[telemetry] fetch threw synchronously — falling back to sendBeacon', {
      eventType,
      error: fetchErr,
    });
    sendViaSendBeacon(eventType, payload);
  }
};

/**
 * Record a structured re-auth telemetry event. Fire-and-forget: never throws.
 * Always emits to console for local visibility AND persists to the
 * `reauth_telemetry` table for production tracking by admins — via the normal
 * authenticated insert for most event types, or via the beacon edge function
 * for pi_auth_timeout/pi_auth_resolved/pi_auth_error (see BEACON_ONLY_EVENT_TYPES).
 */
export const recordReauthEvent = (
  eventType: ReauthEventType,
  ctx: ReauthEventContext,
  err?: unknown,
): void => {
  const payload = {
    event_type: eventType,
    business_id: ctx.businessId ?? null,
    local_uid: ctx.localUid ?? null,
    auth_uid: ctx.authUid ?? null,
    retry_reason: ctx.retryReason ?? null,
    is_retry: ctx.isRetry ?? false,
    message: ctx.message ?? null,
    metadata: safeMetadata(ctx, err),
    user_agent:
      typeof navigator !== 'undefined' ? navigator.userAgent : null,
    url: typeof window !== 'undefined' ? window.location.href : null,
  };

  // Structured console log (kept for dev/console-based diagnostics)
  // eslint-disable-next-line no-console
  console[
    eventType === 'reauth_triggered' || eventType === 'pi_auth_resolved'
      ? 'warn'
      : 'error'
  ](
    `[telemetry] ${eventType}`,
    payload,
  );

  if (BEACON_ONLY_EVENT_TYPES.has(eventType)) {
    // See the block comment near BEACON_ENDPOINT_URL above: this event type
    // structurally cannot pass reauth_telemetry's RLS via the normal
    // authenticated-session insert, so don't waste a network call on a path
    // that's guaranteed to fail — route through the beacon edge function only.
    sendBeaconOnlyEvent(eventType, payload);
    return;
  }

  // Best-effort insert to the telemetry table. Never throw. (Unchanged for all
  // other event types — these fire at points in the auth lifecycle where a
  // valid Supabase session may well already exist.)
  try {
    void supabase
      .from('reauth_telemetry')
      .insert([payload as any])
      .then(({ error }) => {
        if (error) {
          // eslint-disable-next-line no-console
          console.warn('[telemetry] failed to persist reauth event', {
            eventType,
            error: error.message,
          });
        }
      });
  } catch (insertErr) {
    // eslint-disable-next-line no-console
    console.warn('[telemetry] threw while persisting reauth event', insertErr);
  }
};
