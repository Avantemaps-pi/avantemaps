/**
 * usePaymentStatusPolling
 * -----------------------
 * Polls payment-status edge function until the payment reaches a terminal
 * state (completed, cancelled, voided, or error), or until a timeout/maxAttempts
 * is reached. Designed to back UI flows that need to disable duplicate
 * submissions once the server-side payment lifecycle has resolved.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { getPaymentStatus } from '@/api/payments';
import type { PaymentResponse, PaymentStatus } from '@/api/payments/types';

export type TerminalReason = 'completed' | 'cancelled' | 'voided' | 'error' | 'timeout';

export interface PaymentPollingState {
  paymentId: string | null;
  status: PaymentStatus | null;
  isPolling: boolean;
  isTerminal: boolean;
  terminalReason: TerminalReason | null;
  attempts: number;
  lastResponse: PaymentResponse | null;
}

interface Options {
  intervalMs?: number;
  maxAttempts?: number;
}

const DEFAULT_INTERVAL = 3000;
const DEFAULT_MAX_ATTEMPTS = 40; // ~2 minutes at 3s

function deriveTerminal(status: PaymentStatus | null | undefined): TerminalReason | null {
  if (!status) return null;
  if (status.completed) return 'completed';
  if (status.cancelled) return 'cancelled';
  if ((status as any).voided) return 'voided';
  if (status.error) return 'error';
  return null;
}

export function usePaymentStatusPolling(opts: Options = {}) {
  const intervalMs = opts.intervalMs ?? DEFAULT_INTERVAL;
  const maxAttempts = opts.maxAttempts ?? DEFAULT_MAX_ATTEMPTS;

  const [state, setState] = useState<PaymentPollingState>({
    paymentId: null,
    status: null,
    isPolling: false,
    isTerminal: false,
    terminalReason: null,
    attempts: 0,
    lastResponse: null,
  });

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cancelledRef = useRef(false);
  const activeIdRef = useRef<string | null>(null);

  const clearTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const stop = useCallback(() => {
    cancelledRef.current = true;
    clearTimer();
    setState((s) => ({ ...s, isPolling: false }));
  }, []);

  const reset = useCallback(() => {
    cancelledRef.current = true;
    clearTimer();
    activeIdRef.current = null;
    setState({
      paymentId: null,
      status: null,
      isPolling: false,
      isTerminal: false,
      terminalReason: null,
      attempts: 0,
      lastResponse: null,
    });
  }, []);

  const start = useCallback(
    (paymentId: string) => {
      if (!paymentId) return;
      // Reset prior run
      cancelledRef.current = false;
      clearTimer();
      activeIdRef.current = paymentId;
      setState({
        paymentId,
        status: null,
        isPolling: true,
        isTerminal: false,
        terminalReason: null,
        attempts: 0,
        lastResponse: null,
      });

      let attempts = 0;

      const tick = async () => {
        if (cancelledRef.current || activeIdRef.current !== paymentId) return;
        attempts += 1;
        try {
          const response = await getPaymentStatus(paymentId);
          if (cancelledRef.current || activeIdRef.current !== paymentId) return;

          const terminalReason = deriveTerminal(response.status);
          const isTerminal = !!terminalReason;

          setState({
            paymentId,
            status: response.status ?? null,
            isPolling: !isTerminal && attempts < maxAttempts,
            isTerminal,
            terminalReason,
            attempts,
            lastResponse: response,
          });

          if (isTerminal) {
            clearTimer();
            return;
          }

          if (attempts >= maxAttempts) {
            clearTimer();
            setState((s) => ({
              ...s,
              isPolling: false,
              isTerminal: true,
              terminalReason: 'timeout',
            }));
            return;
          }
        } catch (err) {
          if (cancelledRef.current || activeIdRef.current !== paymentId) return;
          // Transient error: continue polling unless we hit the cap
          if (attempts >= maxAttempts) {
            clearTimer();
            setState((s) => ({
              ...s,
              isPolling: false,
              isTerminal: true,
              terminalReason: 'timeout',
              attempts,
            }));
            return;
          }
          setState((s) => ({ ...s, attempts }));
        }

        timerRef.current = setTimeout(tick, intervalMs);
      };

      // Kick off immediately, then schedule
      tick();
    },
    [intervalMs, maxAttempts]
  );

  useEffect(() => {
    return () => {
      cancelledRef.current = true;
      clearTimer();
    };
  }, []);

  return { ...state, start, stop, reset };
}
