/**
 * Structured logger for edge functions with correlation ID support.
 *
 * Emits one JSON line per event for easy log aggregation. Correlation IDs
 * link client → approve-payment → complete-payment → status calls so a single
 * payment lifecycle can be traced end-to-end.
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogContext {
  fn: string;
  correlationId: string;
  paymentId?: string;
  userId?: string;
  txid?: string;
  [k: string]: unknown;
}

export function getOrCreateCorrelationId(req: Request): string {
  const fromHeader =
    req.headers.get('x-correlation-id') ||
    req.headers.get('x-request-id') ||
    req.headers.get('x-trace-id');
  if (fromHeader && /^[a-zA-Z0-9_-]{6,128}$/.test(fromHeader)) {
    return fromHeader;
  }
  return crypto.randomUUID();
}

export function makeLogger(ctx: LogContext) {
  const base = { ...ctx };
  const emit = (level: LogLevel, event: string, data?: Record<string, unknown>) => {
    const line = {
      ts: new Date().toISOString(),
      level,
      event,
      ...base,
      ...(data ?? {}),
    };
    const serialized = JSON.stringify(line);
    if (level === 'error') console.error(serialized);
    else if (level === 'warn') console.warn(serialized);
    else console.log(serialized);
  };
  return {
    debug: (event: string, data?: Record<string, unknown>) => emit('debug', event, data),
    info: (event: string, data?: Record<string, unknown>) => emit('info', event, data),
    warn: (event: string, data?: Record<string, unknown>) => emit('warn', event, data),
    error: (event: string, data?: Record<string, unknown>) => emit('error', event, data),
    extend: (extra: Record<string, unknown>) => {
      Object.assign(base, extra);
    },
    correlationId: ctx.correlationId,
  };
}

export type StructuredLogger = ReturnType<typeof makeLogger>;

/**
 * Headers to merge into every Response so the client can read back the
 * correlation ID and surface it in support flows / client logs.
 */
export function correlationHeaders(correlationId: string) {
  return { 'x-correlation-id': correlationId };
}
