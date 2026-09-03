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

// TEMPORARY diagnostic addition — safe to remove, along with the sendBeacon
// block below and supabase/functions/telemetry-beacon, once we've confirmed or
// ruled out whether Pi Browser's mainnet webview silently blocks fetch() calls
// to Supabase (the leading theory for reauth_telemetry having zero mainnet
// rows despite a confirmed real auth failure in production). sendBeacon uses a
// different browser network primitive than fetch and may not be subject to
// the same restrictions — if beacon-sourced rows show up where fetch-sourced
// ones don't, that's evidence for the theory. Query beacon-sourced rows via:
//   select * from reauth_telemetry where metadata->>'via' = 'beacon_fallback'
//   order by created_at desc;
const BEACON_ENDPOINT_URL = `${getSupabaseFunctionsUrl()}/telemetry-beacon`;
const BEACON_EVENT_TYPES = new Set<ReauthEventType>([
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
 * `reauth_telemetry` table for production tracking by admins.
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

  // Best-effort insert to the telemetry table. Never throw.
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

  // TEMPORARY diagnostic fallback — see the block comment near BEACON_ENDPOINT_URL
  // above. Fires independently of, and in addition to, the primary insert above;
  // this is deliberately redundant for a short diagnostic window, not a
  // replacement path. Scoped to only the three events we're trying to diagnose,
  // to keep the edge function's volume low and the signal clean.
  if (
    BEACON_EVENT_TYPES.has(eventType) &&
    typeof navigator !== 'undefined' &&
    typeof navigator.sendBeacon === 'function'
  ) {
    try {
      const blob = new Blob(
        [JSON.stringify({ ...payload, via: 'beacon_fallback' })],
        { type: 'application/json' },
      );
      navigator.sendBeacon(BEACON_ENDPOINT_URL, blob);
    } catch (beaconErr) {
      // eslint-disable-next-line no-console
      console.warn('[telemetry] threw while sending beacon fallback', beaconErr);
    }
  }
};
