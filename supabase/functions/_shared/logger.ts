/**
 * Structured logger for edge functions.
 *
 * Standard JSON log shape (every line):
 * {
 *   ts: ISO timestamp,
 *   level: 'debug' | 'info' | 'warn' | 'error',
 *   event: '<fn>.<stage>.<verb>'  // dot-separated, lowercase snake_case parts
 *   fn: 'approve-payment' | 'complete-payment' | 'payment-status',
 *   stage: 'validation' | 'lookup' | 'pi_api' | 'db_write' | 'transition' | 'notify' | 'done' | 'error',
 *   lifecycleId: string,            // end-to-end ID across approve → complete → status
 *   paymentId?: string,
 *   userId?: string,
 *   txid?: string,
 *   terminalReason?: 'completed' | 'cancelled' | 'voided' | 'error' | 'timeout' | null,
 *   from?: unknown,                 // for stage='transition'
 *   to?: unknown,                   // for stage='transition'
 *   ...extras                       // free-form extras
 * }
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export type LogStage =
  | 'validation'
  | 'lookup'
  | 'pi_api'
  | 'db_write'
  | 'transition'
  | 'notify'
  | 'done'
  | 'error';

export type TerminalReason =
  | 'completed'
  | 'cancelled'
  | 'voided'
  | 'error'
  | 'timeout'
  | null;

export interface LogContext {
  fn: string;
  lifecycleId: string;
  paymentId?: string;
  userId?: string;
  txid?: string;
  [k: string]: unknown;
}

export interface LogPayload {
  stage: LogStage;
  terminalReason?: TerminalReason;
  from?: unknown;
  to?: unknown;
  [k: string]: unknown;
}

/**
 * Reads a lifecycle/correlation ID from inbound headers, or mints a new one.
 * Accepted headers: x-lifecycle-id, x-correlation-id, x-request-id, x-trace-id.
 */
export function getOrCreateLifecycleId(req: Request): string {
  const fromHeader =
    req.headers.get('x-lifecycle-id') ||
    req.headers.get('x-correlation-id') ||
    req.headers.get('x-request-id') ||
    req.headers.get('x-trace-id');
  if (fromHeader && /^[a-zA-Z0-9_-]{6,128}$/.test(fromHeader)) return fromHeader;
  return crypto.randomUUID();
}

/** Backwards-compatible alias. */
export const getOrCreateCorrelationId = getOrCreateLifecycleId;

export function makeLogger(ctx: LogContext) {
  const base = { ...ctx };

  const emit = (level: LogLevel, event: string, payload: LogPayload) => {
    const line = {
      ts: new Date().toISOString(),
      level,
      event,
      ...base,
      ...payload,
    };
    const serialized = JSON.stringify(line);
    if (level === 'error') console.error(serialized);
    else if (level === 'warn') console.warn(serialized);
    else console.log(serialized);
  };

  return {
    debug: (event: string, payload: LogPayload) => emit('debug', event, payload),
    info: (event: string, payload: LogPayload) => emit('info', event, payload),
    warn: (event: string, payload: LogPayload) => emit('warn', event, payload),
    error: (event: string, payload: LogPayload) => emit('error', event, payload),
    /** Standardized state-transition log. */
    transition: (
      from: unknown,
      to: unknown,
      opts: { terminalReason?: TerminalReason; [k: string]: unknown } = {}
    ) =>
      emit('info', `${base.fn}.transition`, {
        stage: 'transition',
        from,
        to,
        terminalReason: opts.terminalReason ?? null,
        ...opts,
      }),
    extend: (extra: Record<string, unknown>) => {
      Object.assign(base, extra);
    },
    lifecycleId: ctx.lifecycleId,
  };
}

export type StructuredLogger = ReturnType<typeof makeLogger>;

/** Response headers that echo the lifecycle ID for cross-system correlation. */
export function correlationHeaders(lifecycleId: string) {
  return {
    'x-lifecycle-id': lifecycleId,
    'x-correlation-id': lifecycleId, // backwards-compatible alias
  };
}

/**
 * Derive the canonical terminalReason for a payment status payload.
 * Returns null when the payment is still in-flight.
 */
export function deriveTerminalReason(status: any): TerminalReason {
  if (!status) return null;
  if (status.completed) return 'completed';
  if (status.cancelled) return 'cancelled';
  if (status.voided) return 'voided';
  if (status.error) return 'error';
  return null;
}
