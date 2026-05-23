import { supabase } from '@/integrations/supabase/client';

export type ReauthEventType =
  | 'reauth_triggered'
  | 'reauth_failed'
  | 'reauth_retry_exhausted';

export interface ReauthEventContext {
  businessId?: number | null;
  localUid?: string | null;
  authUid?: string | null;
  retryReason?: string | null;
  isRetry?: boolean;
  message?: string | null;
  metadata?: Record<string, unknown>;
}

const safeMetadata = (
  ctx: ReauthEventContext,
  err?: unknown,
): Record<string, unknown> => {
  const meta: Record<string, unknown> = { ...(ctx.metadata ?? {}) };
  if (err) {
    if (err instanceof Error) {
      meta.error = { name: err.name, message: err.message, stack: err.stack };
    } else {
      try {
        meta.error = JSON.parse(JSON.stringify(err));
      } catch {
        meta.error = String(err);
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
  console[eventType === 'reauth_triggered' ? 'warn' : 'error'](
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
};
