/**
 * Pi Network Client Core
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
  AuthResult,
  PiPaymentInitiateOptions,
  PaymentCallbacks,
} from "./types";

declare global {
  interface Window {
    Pi?: any;
  }
}

// State management
let sdkInitialized = false;
let cachedAuthResult: AuthResult | null = null;
let incompletePaymentHandler: ((payment: PiPaymentDTO) => void) | null = null;

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
 * SDK Initialization
 * ----------------------------------------------------- */
export function initPi(config: PiConfig = {}): PiInitData {
  const Pi = requirePi();

  Pi.init({
    sandbox: config.sandbox ?? false,
  });

  sdkInitialized = true;

  return {
    sdk: Pi,
    sandbox: config.sandbox ?? false,
  };
}

// Alias for backward compatibility
export async function initializePiNetwork(): Promise<boolean> {
  try {
    if (sdkInitialized) return true;
    
    if (typeof window === "undefined" || !window.Pi) {
      console.warn("Pi SDK not available");
      return false;
    }

    const sandbox = determineSandboxMode();
    initPi({ sandbox });
    return true;
  } catch (error) {
    console.error("Failed to initialize Pi Network:", error);
    return false;
  }
}

export function isSdkInitialized(): boolean {
  return sdkInitialized;
}

export function determineSandboxMode(): boolean {
  // Check if we're in development or testing mode
  const isDev = import.meta.env.DEV;
  const isTestnet = window.location.hostname === 'localhost' || 
                    window.location.hostname === '127.0.0.1' ||
                    window.location.hostname.includes('preview');
  return isDev || isTestnet;
}

export async function forceSdkReinitialization(): Promise<boolean> {
  sdkInitialized = false;
  return initializePiNetwork();
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

    cachedAuthResult = {
      accessToken: result.accessToken,
      user: {
        uid: result.user.uid,
        username: result.user.username,
        roles: result.user.roles,
      },
    };

    return {
      uid: result.user.uid,
      username: result.user.username,
      accessToken: result.accessToken,
    };
  } catch (err: any) {
    throw new Error(`Pi authentication failed: ${err?.message || err}`);
  }
}

// Alias for backward compatibility
export async function authenticateUser(
  scopes: string[] = ["username", "payments"]
): Promise<AuthResult> {
  const result = await authenticate(scopes);
  return {
    accessToken: result.accessToken,
    user: {
      uid: result.uid,
      username: result.username,
    },
  };
}

export async function requestUserPermissions(
  scopes: string[] = ["username", "payments"]
): Promise<boolean> {
  try {
    await authenticate(scopes);
    return true;
  } catch {
    return false;
  }
}

export function getPiAuthResult(): AuthResult | null {
  return cachedAuthResult;
}

export function clearPiAuth(): void {
  cachedAuthResult = null;
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

// Alias for backward compatibility
export async function createPiPayment(
  options: PiPaymentInitiateOptions,
  callbacks?: PaymentCallbacks
): Promise<any> {
  const Pi = requirePi();

  const paymentData = {
    amount: options.amount,
    memo: options.memo,
    metadata: options.metadata || {},
  };

  const defaultCallbacks: PiCallbacks = {
    onReadyForServerApproval: callbacks?.onReadyForServerApproval || ((id) => console.log("Ready for approval:", id)),
    onReadyForServerCompletion: callbacks?.onReadyForServerCompletion || ((id, txid) => console.log("Ready for completion:", id, txid)),
    onIncompletePaymentFound: incompletePaymentHandler || ((payment) => console.log("Incomplete payment:", payment)),
    onCancel: callbacks?.onCancel || ((id) => console.log("Payment cancelled:", id)),
    onError: callbacks?.onError || ((error) => console.error("Payment error:", error)),
  };

  return Pi.createPayment(paymentData, defaultCallbacks);
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

export function setIncompletePaymentHandler(
  handler: (payment: PiPaymentDTO) => void
): void {
  incompletePaymentHandler = handler;
}

// Alias for backward compatibility
export function initializePi(): boolean {
  try {
    initializePiNetwork();
    return true;
  } catch {
    return false;
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

// For dynamic import compatibility
export const piNetworkCore = {
  initialize: initializePiNetwork,
  authenticate: authenticateUser,
};
