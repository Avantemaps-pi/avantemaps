/**
 * src/utils/piNetwork/core.ts
 * Robust Pi SDK loader & core wrapper (drop-in replacement)
 */

import { SubscriptionTier } from './types';

export interface AuthResult {
  accessToken: string;
  user: {
    uid: string;
    username: string;
    wallet_address?: string;
    roles?: string[];
  };
}

export interface PaymentData {
  amount: number;
  memo: string;
  metadata: {
    subscriptionTier: SubscriptionTier;
    frequency: string;
    [key: string]: any;
  };
}

export interface PaymentCallbacks {
  onReadyForServerApproval: (paymentId: string) => void;
  onReadyForServerCompletion: (paymentId: string, txid: string) => void;
  onCancel: (paymentId: string) => void;
  onError: (error: Error, payment?: any) => void;
}

export interface PaymentDTO {
  identifier: string;
  user_uid: string;
  amount: number;
  memo: string;
  metadata: any;
  from_address: string;
  to_address: string;
  direction: 'user_to_app' | 'app_to_user';
  created_at: string;
  network: 'Pi Network' | 'Pi Testnet';
  status: {
    developer_approved: boolean;
    transaction_verified: boolean;
    developer_completed: boolean;
    cancelled: boolean;
    user_cancelled: boolean;
  };
  transaction: null | {
    txid: string;
    verified: boolean;
    _link: string;
  };
}

declare global {
  interface Window {
    Pi?: any;
    __piInitState?: {
      loading: boolean;
      loaded: boolean;
      error?: string | null;
      scriptEl?: HTMLScriptElement | null;
      promise?: Promise<boolean>;
    };
  }
}

const SDK_URL = 'https://sdk.minepi.com/pi-sdk.js';
const LOAD_TIMEOUT = 15_000;
const INIT_TIMEOUT = 5_000;

class PiNetworkCore {
  private isInitialized = false;
  private authResult: AuthResult | null = null;
  private incompletePaymentHandler: ((p: PaymentDTO) => void) | null = null;

  /** Single-shot loader that waits for the SDK script (idempotent). */
  private loadSdkScript(timeout = LOAD_TIMEOUT): Promise<boolean> {
    if (typeof window === 'undefined') return Promise.resolve(false);

    // If window.Pi already present, return true
    if ((window as any).Pi) {
      window.__piInitState = window.__piInitState || { loading: false, loaded: true, error: null, scriptEl: null, promise: Promise.resolve(true) };
      return Promise.resolve(true);
    }

    // Reuse existing loader promise if present
    if (window.__piInitState?.promise) return window.__piInitState.promise;

    // If there's an existing script tag for the SDK, attach listeners to it
    const existing = document.querySelector<HTMLScriptElement>('script[src*="pi-sdk.js"]');

    const promise = new Promise<boolean>((resolve) => {
      let resolved = false;
      const cleanup = (scriptEl?: HTMLScriptElement | null) => {
        if (resolved) return;
        resolved = true;
        if (scriptEl) window.__piInitState!.scriptEl = scriptEl;
      };

      const onLoadHandler = () => {
        cleanup(existing || null);
        resolve(!!(window as any).Pi);
      };
      const onErrorHandler = (ev?: any) => {
        cleanup(existing || null);
        resolve(false);
      };

      // Attach timeout safety
      const t = setTimeout(() => {
        onErrorHandler();
      }, timeout);

      if (existing) {
        // If the existing script already loaded (readyState or loaded), proceed
        // Note: older browsers may not set readyState; still safe to attach handlers
        existing.addEventListener('load', () => {
          clearTimeout(t);
          onLoadHandler();
        });
        existing.addEventListener('error', (e) => {
          clearTimeout(t);
          onErrorHandler(e);
        });

        // If it already finished loading (rare), check immediately
        if ((window as any).Pi) {
          clearTimeout(t);
          onLoadHandler();
        }
      } else {
        // Create and append script
        const script = document.createElement('script');
        script.async = true;
        script.defer = true;
        script.src = SDK_URL;
        script.setAttribute('data-pi-sdk', 'true');

        script.addEventListener('load', () => {
          clearTimeout(t);
          onLoadHandler();
        });
        script.addEventListener('error', (e) => {
          clearTimeout(t);
          onErrorHandler(e);
        });

        document.head.appendChild(script);
        window.__piInitState = { loading: true, loaded: false, error: null, scriptEl: script, promise: undefined };
      }
    });

    window.__piInitState = window.__piInitState || { loading: true, loaded: false, error: null, scriptEl: null, promise };
    window.__piInitState.promise = promise;
    return promise;
  }

  private determineSandboxMode(): boolean {
    try {
      const hostname = typeof window !== 'undefined' ? window.location.hostname.toLowerCase() : '';
      return (
        hostname.includes('testnet') ||
        hostname.includes('localhost') ||
        hostname.includes('127.0.0.1') ||
        hostname.includes('dev') ||
        hostname.includes('staging')
      );
    } catch {
      return false;
    }
  }

  public async initialize(): Promise<void> {
    if (this.isInitialized) return;

    // Load SDK script first
    const ok = await this.loadSdkScript();
    if (!ok) {
      throw new Error('Failed to load Pi SDK script or window.Pi is not present');
    }

    // At this point window.Pi should exist (but still be defensive)
    if (!(window as any).Pi) {
      throw new Error('Pi SDK loaded but window.Pi is undefined');
    }

    // Call Pi.init — handle both Promise-returning and non-Promise implementations
    const sandbox = this.determineSandboxMode();

    try {
      // Some SDKs return a Promise, some don't.
      // Call and detect.
      const maybePromise = (window as any).Pi.init ? (window as any).Pi.init({ version: '2.0', sandbox }) : undefined;

      if (maybePromise && typeof maybePromise.then === 'function') {
        // wait for it but with a timeout
        await Promise.race([
          maybePromise,
          new Promise((_, reject) => setTimeout(() => reject(new Error('Pi.init timed out')), INIT_TIMEOUT))
        ]);
      } else {
        // no promise returned — give it a short moment to set internal state
        await new Promise(res => setTimeout(res, 250));
      }

      // final sanity check
      if (!(window as any).Pi || typeof (window as any).Pi.authenticate !== 'function') {
        throw new Error('Pi SDK did not initialize correctly (authenticate missing)');
      }

      this.isInitialized = true;
      // mark global flag for other modules
      (window as any).__piInitialized = true;
    } catch (err) {
      // clear any partial initialized state
      this.isInitialized = false;
      (window as any).__piInitialized = false;
      throw err;
    }
  }

  public async authenticate(): Promise<AuthResult> {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      if (!(window as any).Pi || typeof (window as any).Pi.authenticate !== 'function') {
        throw new Error('Pi SDK not available or authenticate() missing');
      }

      const scopes = ['payments', 'username', 'wallet_address'];

      const onIncomplete = (payment: PaymentDTO) => {
        try {
          if (this.incompletePaymentHandler) this.incompletePaymentHandler(payment);
          else sessionStorage.setItem('pi_incomplete_payment', JSON.stringify(payment));
        } catch (e) {
          // ignore storage errors
        }
      };

      // call authenticate and await result (SDK returns a Promise in modern versions)
      const result = await (window as any).Pi.authenticate(scopes, onIncomplete);
      this.authResult = result as AuthResult;

      // (Optional) the caller/other layer should perform backend verification
      return this.authResult!;
    } catch (err) {
      // keep shape similar to prior code: reject with structured error
      return Promise.reject(err instanceof Error ? err : new Error(String(err)));
    }
  }

  public setIncompletePaymentHandler(handler: (p: PaymentDTO) => void) {
    this.incompletePaymentHandler = handler;
  }

  public async createPayment(paymentData: PaymentData, callbacks: PaymentCallbacks) {
    if (!this.isInitialized) await this.initialize();
    if (!this.authResult) throw new Error('Not authenticated');
    if (!(window as any).Pi || typeof (window as any).Pi.createPayment !== 'function') {
      throw new Error('Pi.createPayment not available');
    }

    try {
      (window as any).Pi.createPayment(paymentData, callbacks);
    } catch (err) {
      throw err;
    }
  }

  public getAuthResult(): AuthResult | null {
    return this.authResult;
  }

  public isAuthenticated(): boolean {
    return this.authResult !== null;
  }

  public isSdkInitialized(): boolean {
    return this.isInitialized && !!(window as any).Pi;
  }

  public clearAuth(): void {
    this.authResult = null;
  }
}

export const piNetworkCore = new PiNetworkCore();

// Convenience wrappers (keeps your existing exports)
export const initializePi = async (): Promise<boolean> => {
  try {
    if (typeof window === 'undefined') return false;
    // Support DEV fallback (mock) only if you explicitly relied on it
    if (!window.Pi && import.meta.env.DEV) {
      // lightweight mock for dev
      window.Pi = {
        init: () => {},
        authenticate: async () => ({ user: { uid: 'dev', username: 'dev_user' }, accessToken: 'dev_token' }),
        createPayment: () => {}
      };
    }
    await piNetworkCore.initialize();
    return true;
  } catch (e) {
    console.error('initializePi error:', e);
    return false;
  }
};

export const authenticateUser = () => piNetworkCore.authenticate();
export const createPiPayment = (data: PaymentData, callbacks: PaymentCallbacks) => piNetworkCore.createPayment(data, callbacks);
export const isUserAuthenticated = () => piNetworkCore.isAuthenticated();
export const setIncompletePaymentHandler = (handler: (p: PaymentDTO) => void) => piNetworkCore.setIncompletePaymentHandler(handler);
export const clearPiAuth = () => piNetworkCore.clearAuth();
export const getPiAuthResult = () => piNetworkCore.getAuthResult();

// export determineSandboxMode for other modules
private determineSandboxMode(): boolean {
  if (typeof window === "undefined") return false;

  const hostname = window.location.hostname.toLowerCase();

  return (
    hostname === "localhost" ||
    hostname.includes("127.0.0.1") ||
    hostname.includes("dev") ||
    hostname.includes("sandbox") ||
    hostname.endsWith("minepi.com")
  );
}

// legacy exports
export const initializePiNetwork = initializePi;
export const requestUserPermissions = async () => {
  try {
    const r = await authenticateUser();
    return {
      username: r.user.username,
      uid: r.user.uid,
      walletAddress: (r.user as any).wallet_address
    };
  } catch (err) {
    return null;
  }
};
export const isSdkInitialized = () => piNetworkCore.isSdkInitialized();
export const forceSdkReinitialization = async (): Promise<boolean> => {
  try {
    piNetworkCore.clearAuth();
    return await initializePi();
  } catch (e) {
    return false;
  }
};
