/**
 * Pi Network SDK Core - Clean, Modern Implementation
 * ~180 lines | TypeScript | Production-ready
 */

import type { AuthResult, PaymentDTO, PaymentCallbacks, PaymentData, Scope } from './types';

// ─────────────────────────────────────────────────────────────────────────────
// State Machine
// ─────────────────────────────────────────────────────────────────────────────
let sdkLoaded = false;
let sdkInitializing = false;
let sandboxMode = false;
let cachedAuth: AuthResult | null = null;
let incompletePaymentHandler: ((payment: PaymentDTO) => void) | null = null;

const AUTH_STORAGE_KEY = 'pi_auth_result';
const SDK_URL = 'https://sdk.minepi.com/pi-sdk.js';

// Use existing global Pi declaration from global.d.ts

// ─────────────────────────────────────────────────────────────────────────────
// Pi SDK Script Loader
// ─────────────────────────────────────────────────────────────────────────────
const loadPiSdk = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    // Early exit if already loaded
    if (window.Pi) {
      resolve();
      return;
    }

    // Check if script is already injected
    if (document.querySelector(`script[src="${SDK_URL}"]`)) {
      const checkInterval = setInterval(() => {
        if (window.Pi) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 100);
      setTimeout(() => {
        clearInterval(checkInterval);
        reject(new Error('SDK load timeout'));
      }, 10000);
      return;
    }

    // Inject script
    const script = document.createElement('script');
    script.src = SDK_URL;
    script.async = true;
    script.onload = () => {
      if (window.Pi) resolve();
      else reject(new Error('Pi SDK loaded but window.Pi not available'));
    };
    script.onerror = () => reject(new Error('Failed to load Pi SDK script'));
    document.head.appendChild(script);
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// Pi Browser Detection
// ─────────────────────────────────────────────────────────────────────────────
export const isPiBrowser = (): boolean => {
  if (typeof window === 'undefined') return false;
  return !!window.Pi || navigator.userAgent.includes('PiBrowser');
};

export const determineSandboxMode = (): boolean => {
  if (typeof window === 'undefined') return true;
  const host = window.location.hostname;
  return import.meta.env.DEV || 
         host === 'localhost' || 
         host === '127.0.0.1' || 
         host.includes('preview') ||
         host.includes('lovableproject.com');
};

// ─────────────────────────────────────────────────────────────────────────────
// SDK Initialization
// ─────────────────────────────────────────────────────────────────────────────
export const initializePiNetwork = async (): Promise<boolean> => {
  if (sdkLoaded) return true;
  if (sdkInitializing) return false;

  sandboxMode = determineSandboxMode();

  // In non-Pi Browser environments with sandbox mode, skip SDK initialization
  // and allow test mode to work without timing out
  if (!isPiBrowser() && sandboxMode) {
    console.warn('⚠️ Not in Pi Browser - SDK initialization skipped (test mode available)');
    sdkLoaded = true; // Mark as "loaded" so test mode can proceed
    return true;
  }

  sdkInitializing = true;

  try {
    await loadPiSdk();
    
    if (!window.Pi) {
      console.warn('⚠️ Pi SDK not available after loading');
      return false;
    }

    window.Pi.init({ version: '2.0', sandbox: sandboxMode });
    (window as any).__piInitialized = true;
    sdkLoaded = true;
    console.log(`✅ Pi SDK initialized (sandbox: ${sandboxMode})`);
    return true;
  } catch (error) {
    console.warn('⚠️ Pi SDK initialization failed:', error instanceof Error ? error.message : error);
    return false;
  } finally {
    sdkInitializing = false;
  }
};

export const isSdkInitialized = (): boolean => sdkLoaded;

export const forceSdkReinitialization = async (): Promise<boolean> => {
  sdkLoaded = false;
  return initializePiNetwork();
};

// ─────────────────────────────────────────────────────────────────────────────
// Authentication Helpers
// ─────────────────────────────────────────────────────────────────────────────
export const authenticate = async (scopes: Scope[] = ['username', 'payments']): Promise<AuthResult> => {
  if (!sdkLoaded) await initializePiNetwork();
  if (!window.Pi) throw new Error('Pi SDK not available');

  const result = await window.Pi.authenticate(scopes, (uuid) => uuid);
  
  const authResult: AuthResult = {
    accessToken: result.accessToken,
    user: {
      uid: result.user.uid,
      username: result.user.username,
      roles: result.user.roles,
    },
  };

  // Cache in memory and localStorage
  cachedAuth = authResult;
  try {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authResult));
  } catch { /* localStorage unavailable */ }

  return authResult;
};

export const getCachedAuth = (): AuthResult | null => {
  if (cachedAuth) return cachedAuth;
  
  try {
    const stored = localStorage.getItem(AUTH_STORAGE_KEY);
    if (stored) {
      cachedAuth = JSON.parse(stored);
      return cachedAuth;
    }
  } catch { /* localStorage unavailable */ }
  
  return null;
};

export const clearAuth = (): void => {
  cachedAuth = null;
  try {
    localStorage.removeItem(AUTH_STORAGE_KEY);
  } catch { /* localStorage unavailable */ }
};

// Backward-compatible aliases
export const authenticateUser = authenticate;
export const getPiAuthResult = getCachedAuth;
export const clearPiAuth = clearAuth;
export const requestUserPermissions = async (scopes: Scope[] = ['username', 'payments']): Promise<boolean> => {
  try { await authenticate(scopes); return true; } catch { return false; }
};

// ─────────────────────────────────────────────────────────────────────────────
// Payment Helpers
// ─────────────────────────────────────────────────────────────────────────────
export const createPayment = async (
  data: PaymentData,
  callbacks: PaymentCallbacks
): Promise<PaymentDTO | null> => {
  if (!sdkLoaded) await initializePiNetwork();
  if (!window.Pi) {
    callbacks.onError(new Error('Pi SDK not available'));
    return null;
  }

  return window.Pi.createPayment(data, {
    onReadyForServerApproval: callbacks.onReadyForServerApproval,
    onReadyForServerCompletion: callbacks.onReadyForServerCompletion,
    onCancel: callbacks.onCancel,
    onError: callbacks.onError,
    onIncompletePaymentFound: (payment: PaymentDTO) => {
      incompletePaymentHandler?.(payment);
    },
  });
};

export const setIncompletePaymentHandler = (handler: (payment: PaymentDTO) => void): void => {
  incompletePaymentHandler = handler;
};

// Legacy alias
export const createPiPayment = createPayment;

// ─────────────────────────────────────────────────────────────────────────────
// High-Level Exports
// ─────────────────────────────────────────────────────────────────────────────
export const PiClient = {
  init: initializePiNetwork,
  authenticate,
  createPayment,
  getCachedAuth,
  clearAuth,
  isPiBrowser,
};

export const piNetworkCore = {
  initialize: initializePiNetwork,
  authenticate,
};

// Legacy aliases for backward compatibility
export const initPi = initializePiNetwork;
export const initializePi = (): boolean => { initializePiNetwork(); return true; };
