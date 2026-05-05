/**
 * Correlation ID helpers for end-to-end payment lifecycle tracing.
 *
 * A single correlation ID is generated per payment attempt and propagated
 * through every approve / complete / status edge-function call. Edge
 * functions echo it back in the `x-correlation-id` response header so the
 * server-side logs can be lined up with client logs in support flows.
 */

const CORRELATION_HEADER = 'x-correlation-id';

export function generateCorrelationId(prefix = 'pay'): string {
  // crypto.randomUUID is available in modern browsers.
  const uuid =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  return `${prefix}_${uuid}`;
}

export function correlationHeaders(correlationId: string): Record<string, string> {
  return { [CORRELATION_HEADER]: correlationId };
}

export { CORRELATION_HEADER };
