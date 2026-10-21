/**
 * Lifecycle / correlation ID helpers for end-to-end payment tracing.
 *
 * One lifecycle ID is generated per payment attempt and propagated through
 * every approve / complete / status edge-function call. Edge functions echo
 * it back via `x-lifecycle-id` (and `x-correlation-id` for backwards compat)
 * so client + server logs can be lined up in support flows.
 */

const LIFECYCLE_HEADER = 'x-lifecycle-id';
const CORRELATION_HEADER = 'x-correlation-id';

function randomId(): string {
  if (typeof crypto !== 'undefined') {
    if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
    if (typeof crypto.getRandomValues === 'function') {
      const bytes = crypto.getRandomValues(new Uint8Array(16));
      return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
    }
  }
  // Last resort when no Web Crypto is available at all.
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function generateLifecycleId(prefix = 'pay'): string {
  return `${prefix}_${randomId()}`;
}

/** Backwards-compatible alias. */
export const generateCorrelationId = generateLifecycleId;

export function correlationHeaders(lifecycleId: string): Record<string, string> {
  return {
    [LIFECYCLE_HEADER]: lifecycleId,
    [CORRELATION_HEADER]: lifecycleId,
  };
}

export { CORRELATION_HEADER, LIFECYCLE_HEADER };
