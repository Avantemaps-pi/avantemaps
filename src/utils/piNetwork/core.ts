/**
 * Pi Network Client Core (Option C)
 * ---------------------------------------------------------
 * - Zero hidden abstraction
 * - Each call mapped directly to Pi SDK
 * - Strict typing
 * - Explicit error handling
 * - Predictable flow
 */

import {
  PiCallbacks,
  PiConfig,
  PiInitData,
  PiPaymentDTO,
  PiUserAuthResult,
} from "./types";

declare global {
  interface Window {
    Pi: any | undefined;
  }
}

/* -------------------------------------------------------
 * Utility: Guard Pi SDK
 * ----------------------------------------------------- */
function requirePi(): any {
  if (typeof window === "undefined" || !window.Pi) {
    throw new Error("Pi SDK is not available in the browser window.");
  }
  return window.Pi;
}

/* -------------------------------------------------------
 * Client Initializer
 * ----------------------------------------------------- */
export function initPi(config: PiConfig = {}): PiInitData {
  const Pi = requirePi();

  Pi.init({
    sandbox: config.sandbox ?? false,
  });

  return {
    sdk: Pi,
    sandbox: config.sandbox ?? false,
  };
}

/* -------------------------------------------------------
 * Authentication
 * ----------------------------------------------------- */
export async function authenticate(
  scopes: string[] = ["username", "payments"]
): Promise<PiUserAuthResult> {
  const Pi = requirePi();

  try {
    const result = await Pi.authenticate(
      scopes,
      (uuid: string) => uuid,
      (username: string) => username
    );

    return {
      uid: result.user.uid,
      username: result.user.username,
      accessToken: result.accessToken,
    };
  } catch (err: any) {
    throw new Error(`Pi authentication failed: ${err?.message || err}`);
  }
}

/* -------------------------------------------------------
 * Payments
 * ----------------------------------------------------- */
export async function createPayment(
  dto: PiPaymentDTO,
  callbacks: PiCallbacks
): Promise<any> {
  const Pi = requirePi();

  try {
    const paymentPromise = Pi.createPayment(dto, {
      onReadyForServerApproval: callbacks.onReadyForServerApproval,
      onReadyForServerCompletion: callbacks.onReadyForServerCompletion,
      onIncompletePaymentFound: callbacks.onIncompletePaymentFound,
      onCancel: callbacks.onCancel,
      onError: callbacks.onError,
    });

    const payment = await paymentPromise;

    return payment;
  } catch (err: any) {
    throw new Error(`Failed to create Pi payment: ${err?.message || err}`);
  }
}

/* -------------------------------------------------------
 * Helper: Resume Incomplete Payments
 * ----------------------------------------------------- */
export async function resumeIncompletePayments(
  callbacks: PiCallbacks
): Promise<void> {
  const Pi = requirePi();

  try {
    Pi.onIncompletePaymentFound(callbacks.onIncompletePaymentFound);
  } catch (err: any) {
    throw new Error(
      `Could not configure incomplete payment listener: ${err?.message || err}`
    );
  }
}

/* -------------------------------------------------------
 * Export High-Level Client (optional convenience)
 * ----------------------------------------------------- */
export const PiClient = {
  init: initPi,
  authenticate,
  createPayment,
  resumeIncompletePayments,
};
