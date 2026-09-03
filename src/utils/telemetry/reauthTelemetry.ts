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
// role key (bypassing RLS) via navigator.sendBeacon() (no session/JWT needed).
// Query beacon-sourced rows via:
//   select * from reauth_telemetry where metadata->>'via' = 'beacon'
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
    if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
      try {
        const blob = new Blob(
          [JSON.stringify({ ...payload, via: 'beacon' })],
          { type: 'application/json' },
        );
        navigator.sendBeacon(BEACON_ENDPOINT_URL, blob);
      } catch (beaconErr) {
        // eslint-disable-next-line no-console
        console.warn('[telemetry] threw while sending beacon-only event', beaconErr);
      }
    } else {
      // eslint-disable-next-line no-console
      console.warn('[telemetry] navigator.sendBeacon unavailable — beacon-only event dropped', {
        eventType,
      });
    }
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
