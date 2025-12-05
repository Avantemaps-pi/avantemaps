/**
 * Pi Payment Utilities – Clean Rewrite
 * ------------------------------------
 * Works with the new core.ts (Option A rewrite)
 */

import {
  initializePiNetwork,
  createPiPayment,
  getPiAuthResult,
  setIncompletePaymentHandler,
} from '../piNetwork/core';

import type {
  PiPaymentInitiateOptions,
  PiPaymentCallbacks,
} from '../piNetwork/types';

/**
 * Ensures the Pi SDK is fully initialized before doing anything.
 */
export async function initPiForPayments(): Promise<void> {
  const ok = await initializePiNetwork();

  if (!ok) {
    throw new Error('Failed to initialize Pi Network SDK');
  }
}

/**
 * Start a payment (full metadata + callbacks).
 * This is now the unified entry point your UI calls.
 */
export async function startPayment(
  options: PiPaymentInitiateOptions,
  callbacks?: PiPaymentCallbacks
) {
  // Guarantee SDK + auth loaded
  await initPiForPayments();

  // Only then create the payment
  return await createPiPayment(options, callbacks);
}

/**
 * Fetches the latest Pi Auth payload from localStorage (if any).
 * Useful for restoring sessions after reload.
 */
export { getPiAuthResult };

/**
 * Registers the cross-session handler for unfinished payments.
 */
export { setIncompletePaymentHandler };
