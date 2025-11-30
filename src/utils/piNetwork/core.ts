/**
 * src/utils/piNetwork/core.ts
 *
 * Final, robust Pi SDK loader & core wrapper.
 * - Idempotent SDK loader
 * - Public determineSandboxMode()
 * - Dev mock fallback (import.meta.env.DEV)
 * - Payment callbacks support
 * - Re-init / retry logic
 * - Minimal session persistence (sessionStorage)
 *
 * Usage:
 *  import { initializePiNetwork, authenticateUser, getPiAuthResult, determineSandboxMode } from '@/utils/piNetwork/core';
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
  // sdk-specific fields allowed
  [k: string]: any;
}

export interface PaymentData {
  amount: number;
  memo: string;
  metadata: {
    subscriptionTier?: SubscriptionTier;
    frequency?: string;
    [key: string]: any;
  };
}

export interface PaymentCallbacks {
  onReadyForServerApproval?: (paymentId: string) => void;
  onReadyForServerCompletion?: (paymentId: string, txid: string) => void;
  onCancel?: (paymentId: string) => void;
  onError?: (error: Error, payment?: any) => void;
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
      lastInitAttempt?: number;
    };
    __piAuthSession?: {
      user?: { uid: string; username: string; wallet_address?: string; roles?: string[] };
      lastAuthenticated?: number;
    } | null;
  }
}

/* ========== Configuration ========== */
const SDK_URL = 'https://sdk.minepi.com/pi-sdk.js';
const LOAD_TIMEOUT = 15_000; // ms to wait for sdk script to load
const INIT_TIMEOUT = 6_000; // ms to wait for Pi.init (if returns Promise)
const DEFAULT_RETRY_ATTEMPTS = 2; // attempts to initialize SDK
const SESSION_STORAGE_KEY = 'avante_pi_auth_v1';
/* =================================== */

class PiNetworkCore {
  private isInitialized = false;
  private authResult: AuthResult | null = null;
  private incompletePaymentHandler: ((p: PaymentDTO) => void) | null = null;
  private initInProgressPromise: Promise<boolean> | null = null;

  /** Load SDK script (idempotent). Returns true when window.Pi exists. */
  private async loadSdkScript(timeout = LOAD_TIMEOUT): Promise<boolean> {
    if (typeof window === 'undefined') return false;

    // If Pi already present, succeed
    if (window.Pi) {
      window.__piInitState = window.__piInitState || { loading: false, loaded: true, error: null, scriptEl: null, promise: Promise.resolve(true) };
      return true;
    }

    // Reuse existing promise if available
    if (window.__piInitState?.promise) {
      try {
        return await window.__piInitState.promise;
      } catch {
        // fallthrough to attempt new load below
      }
    }

    // If an existing script tag exists for pi-sdk.js, attach listeners instead of adding a second
    const existing = document.querySelector<HTMLScriptElement>('script[src*="pi-sdk.js"]');

    let externallyResolved = false;
    const promise = new Promise<boolean>((resolve) => {
      const cleanupResolve = (val: boolean) => {
        if (externallyResolved) return;
        externallyResolved = true;
        // store scriptEl for diagnostics
        window.__piInitState = window.__piInitState || { loading: false, loaded: val, error: val ? null : 'load_failed', scriptEl: existing ?? null, promise: undefined };
        resolve(val);
      };

      // timeout handler
      const t = setTimeout(() => {
        cleanupResolve(false);
      }, timeout);

      const onLoad = () => {
        clearTimeout(t);
        cleanupResolve(!!window.Pi);
      };
      const onError = () => {
        clearTimeout(t);
        cleanupResolve(false);
      };

      if (existing) {
        existing.addEventListener('load', onLoad, { once: true });
        existing.addEventListener('error', onError, { once: true });

        // If script already loaded and window.Pi present
        if ((window as any).Pi) {
          clearTimeout(t);
          cleanupResolve(true);
        }
      } else {
        const script = document.createElement('script');
        script.src = SDK_URL;
        script.async = true;
        script.defer = true;
        script.setAttribute('data-pi-sdk', 'true');

        script.addEventListener('load', onLoad, { once: true });
        script.addEventListener('error', onError, { once: true });

        document.head.appendChild(script);
        window.__piInitState = { loading: true, loaded: false, error: null, scriptEl: script, promise: undefined };
      }
    });

    window.__piInitState = window.__piInitState || { loading: true, loaded: false, error: null, scriptEl: null, promise };
    window.__piInitState.promise = promise;
    return await promise;
  }

  /** Determine sandbox (testnet/local) mode (public via exported wrapper) */
  public determineSandboxMode(): boolean {
    try {
      if (typeof window === 'undefined') return false;
      const hostname = (window.location && window.location.hostname || '').toLowerCase();
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

  /** Initialize Pi SDK with retries and strict guard */
  public async initialize(retries = DEFAULT_RETRY_ATTEMPTS): Promise<boolean> {
    if (this.isInitialized) return true;
    if (this.initInProgressPromise) return this.initInProgressPromise;

    this.initInProgressPromise = (async (): Promise<boolean> => {
      let attempt = 0;
      while (attempt <= retries) {
        attempt++;
        try {
          const loaded = await this.loadSdkScript();
          if (!loaded) {
            // If DEV, optionally supply mock and succeed
            if (import.meta.env.DEV) {
              /* eslint-disable @typescript-eslint/ban-ts-comment */
              // @ts-ignore: dev mock
              window.Pi = window.Pi || {
                init: () => {},
                authenticate: async (_scopes: string[] = []) => ({ user: { uid: 'dev', username: 'dev_user' }, accessToken: 'dev_token' }),
                createPayment: () => {}
              };
              // continue to init step below
            } else {
              console.warn(`[Pi SDK] load attempt ${attempt} failed`);
              continue;
            }
          }

          // sanity: window.Pi must exist now
          if (!window.Pi) {
            if (import.meta.env.DEV) {
              // mock fallback for dev (ensure authenticate exists)
              // @ts-ignore
              window.Pi = {
                init: () => {},
                authenticate: async (_scopes: string[] = []) => ({ user: { uid: 'dev', username: 'dev_user' }, accessToken: 'dev_token' }),
                createPayment: () => {}
              };
            } else {
              throw new Error('Pi SDK not present after loading');
            }
          }

          // Call Pi.init; handle Promise or non-Promise implementations
          const sandbox = this.determineSandboxMode();
          try {
            const maybe = typeof window.Pi.init === 'function' ? window.Pi.init({ version: '2.0', sandbox }) : undefined;
            if (maybe && typeof maybe.then === 'function') {
              await Promise.race([
                maybe,
                new Promise((_, reject) => setTimeout(() => reject(new Error('Pi.init timed out')), INIT_TIMEOUT))
              ]);
            } else {
              // give SDK a short moment to set internal state
              await new Promise(res => setTimeout(res, 250));
            }
          } catch (initErr) {
            // Some Pi SDK implementations may throw synchronously; rethrow to trigger retry
            console.warn(`[Pi SDK] Pi.init attempt threw (attempt ${attempt}):`, initErr);
            throw initErr;
          }

          // verify presence of authenticate method
          if (!window.Pi || typeof window.Pi.authenticate !== 'function') {
            throw new Error('Pi SDK did not expose authenticate() after init');
          }

          // mark initialized
          this.isInitialized = true;
          window.__piInitState = window.__piInitState || { loading: false, loaded: true, error: null, scriptEl: window.__piInitState?.scriptEl ?? null, promise: undefined };
          window.__piInitState.loaded = true;
          window.__piInitState.lastInitAttempt = Date.now();

          // restore session if present
          this.tryRestoreSession();

          // Listen for visibility changes to reinit if needed (Pi Browser or network change)
          this.setupAutoReinit();

          return true;
        } catch (err) {
          console.error(`[Pi SDK] initialize attempt ${attempt} failed:`, err);
          // small delay before retry
          if (attempt <= retries) await new Promise(r => setTimeout(r, 300));
        }
      }

      // final failure
      this.isInitialized = false;
      window.__piInitState = window.__piInitState || { loading: false, loaded: false, error: 'init_failed', scriptEl: window.__piInitState?.scriptEl ?? null, promise: undefined };
      window.__piInitState.loaded = false;
      return false;
    })();

    const result = await this.initInProgressPromise;
    this.initInProgressPromise = null;
    return result;
  }

  /** Attempt to silently restore a persisted session (minimal user info) */
  private tryRestoreSession(): void {
    try {
      if (typeof window === 'undefined') return;
      const raw = sessionStorage.getItem(SESSION_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as { user?: any; lastAuthenticated?: number } | null;
      if (!parsed || !parsed.user) return;

      // If session too old (24h), skip restore
      if (parsed.lastAuthenticated && Date.now() - parsed.lastAuthenticated > 24 * 60 * 60 * 1000) {
        sessionStorage.removeItem(SESSION_STORAGE_KEY);
        return;
      }

      // set internal authResult.user (we do not persist accessToken)
      this.authResult = {
        accessToken: '', // empty for security — backend verification required for any sensitive ops
        user: {
          uid: parsed.user.uid,
          username: parsed.user.username,
          wallet_address: parsed.user.wallet_address,
          roles: parsed.user.roles || []
        }
      };
    } catch (e) {
      // ignore parse errors
      console.warn('[Pi SDK] Failed to restore session', e);
    }
  }

  /** Persist minimal session metadata (no access token) */
  private persistSession(): void {
    try {
      if (typeof window === 'undefined') return;
      if (!this.authResult || !this.authResult.user) {
        sessionStorage.removeItem(SESSION_STORAGE_KEY);
        return;
      }
      const payload = {
        user: {
          uid: this.authResult.user.uid,
          username: this.authResult.user.username,
          wallet_address: this.authResult.user.wallet_address,
          roles: this.authResult.user.roles || []
        },
        lastAuthenticated: Date.now()
      };
      sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(payload));
    } catch (e) {
      console.warn('[Pi SDK] Failed to persist session', e);
    }
  }

  /** Setup a light auto re-init mechanism on visibilitychange (helps Pi Browser) */
  private setupAutoReinit(): void {
    try {
      if (typeof window === 'undefined') return;
      const handler = async () => {
        // If hidden -> visible, and SDK isn't initialized, attempt reinit
        if (!document.hidden && !this.isInitialized) {
          try {
            await this.initialize(1);
          } catch (e) {
            // ignore — caller should attempt interactive init on login
          }
        }
      };
      window.removeEventListener('visibilitychange', handler);
      window.addEventListener('visibilitychange', handler);
    } catch {
      // ignore
    }
  }

  /** Authenticate user via Pi SDK (interactive). Returns AuthResult from SDK. */
  public async authenticate(scopes: string[] = ['username', 'payments', 'wallet_address']): Promise<AuthResult> {
    try {
      // ensure initialized (will retry once)
      const ok = await this.initialize(DEFAULT_RETRY_ATTEMPTS);
      if (!ok) throw new Error('Pi SDK initialization failed');

      if (!window.Pi || typeof window.Pi.authenticate !== 'function') {
        throw new Error('Pi SDK authenticate() is not available');
      }

      // attach incomplete payment handler wrapper
      const onIncompletePayment = (payment: PaymentDTO) => {
        try {
          if (this.incompletePaymentHandler) this.incompletePaymentHandler(payment);
          else sessionStorage.setItem('pi_incomplete_payment', JSON.stringify(payment));
        } catch {
          // ignore storage errors
        }
      };

      // call Pi.authenticate — many SDK versions return a Promise
      const authResult = await (window.Pi.authenticate(scopes, onIncompletePayment) as Promise<AuthResult>);

      if (!authResult || !authResult.user || !authResult.accessToken) {
        throw new Error('Authentication returned incomplete result');
      }

      // store in-memory (not persisting accessToken)
      this.authResult = {
        accessToken: authResult.accessToken,
        user: {
          uid: authResult.user.uid,
          username: authResult.user.username,
          wallet_address: authResult.user.wallet_address,
          roles: authResult.user.roles || []
        }
      };

      // persist minimal safe session (no tokens)
      this.persistSession();

      return this.authResult;
    } catch (err) {
      // structured rejection for callers to inspect
      return Promise.reject(err instanceof Error ? err : new Error(String(err)));
    }
  }

  /** Set an incomplete-payment handler */
  public setIncompletePaymentHandler(handler: (p: PaymentDTO) => void): void {
    this.incompletePaymentHandler = handler;
  }

  /** Create a payment using Pi SDK (requires user authenticated) */
  public async createPayment(paymentData: PaymentData, callbacks: PaymentCallbacks): Promise<void> {
    try {
      if (!this.isInitialized) {
        const ok = await this.initialize(1);
        if (!ok) throw new Error('Pi SDK not initialized');
      }
      if (!this.authResult) throw new Error('User not authenticated');
      if (!window.Pi || typeof window.Pi.createPayment !== 'function') throw new Error('Pi.createPayment not available');

      // call SDK
      (window.Pi.createPayment as Function)(paymentData, {
        onReadyForServerApproval: callbacks.onReadyForServerApproval,
        onReadyForServerCompletion: callbacks.onReadyForServerCompletion,
        onCancel: callbacks.onCancel,
        onError: callbacks.onError
      } as any);
    } catch (e) {
      return Promise.reject(e);
    }
  }

  /** Getter for the last auth result (may not include accessToken if restored) */
  public getAuthResult(): AuthResult | null {
    return this.authResult;
  }

  /** Returns whether a user is currently considered authenticated */
  public isAuthenticated(): boolean {
    return this.authResult !== null && !!this.authResult.user;
  }

  /** Returns whether SDK is initialized */
  public isSdkInitialized(): boolean {
    return this.isInitialized && !!(typeof window !== 'undefined' && window.Pi && typeof window.Pi.authenticate === 'function');
  }

  /** Clear auth state (logout) and remove persisted session */
  public clearAuth(): void {
    this.authResult = null;
    try {
      if (typeof window !== 'undefined') sessionStorage.removeItem(SESSION_STORAGE_KEY);
    } catch {
      // ignore
    }
  }
}

/* ========== Export a singleton and convenient wrappers ========== */
export const piNetworkCore = new PiNetworkCore();

/** Wrapper to initialize Pi Network; returns boolean success */
export const initializePiNetwork = async (retries = DEFAULT_RETRY_ATTEMPTS): Promise<boolean> => {
  try {
    if (typeof window === 'undefined') return false;
    // In DEV, allow lightweight mock if SDK absent
    if (!window.Pi && import.meta.env.DEV) {
      // @ts-ignore
      window.Pi = window.Pi || {
        init: () => {},
        authenticate: async (_scopes: string[] = []) => ({ user: { uid: 'dev', username: 'dev_user' }, accessToken: 'dev_token' }),
        createPayment: () => {}
      };
    }
    const ok = await piNetworkCore.initialize(retries);
    return ok;
  } catch (e) {
    console.error('[Pi SDK] initializePiNetwork error:', e);
    return false;
  }
};

/** Interactive authenticate wrapper (exposes same semantic) */
export const authenticateUser = async (scopes: string[] = ['username', 'payments', 'wallet_address']): Promise<AuthResult> => {
  return piNetworkCore.authenticate(scopes);
};

/** Create a payment */
export const createPiPayment = (data: PaymentData, callbacks: PaymentCallbacks) => piNetworkCore.createPayment(data, callbacks);

/** Check if user is authenticated (in-memory) */
export const isUserAuthenticated = () => piNetworkCore.isAuthenticated();

/** Set incomplete payment handler */
export const setIncompletePaymentHandler = (handler: (p: PaymentDTO) => void) => piNetworkCore.setIncompletePaymentHandler(handler);

/** Clear auth */
export const clearPiAuth = () => piNetworkCore.clearAuth();

/** Get auth result (may not contain accessToken if restored) */
export const getPiAuthResult = () => piNetworkCore.getAuthResult();

/** Public determine sandbox helper (for other modules / debugging) */
export const determineSandboxMode = () => piNetworkCore.determineSandboxMode();

/** Legacy compatibility exports expected by other code */
export const requestUserPermissions = async () => {
  try {
    const r = await authenticateUser();
    return {
      username: r.user.username,
      uid: r.user.uid,
      walletAddress: (r.user as any).wallet_address
    };
  } catch {
    return null;
  }
};

export const isSdkInitialized = () => piNetworkCore.isSdkInitialized();

export const forceSdkReinitialization = async (): Promise<boolean> => {
  try {
    piNetworkCore.clearAuth();
    return await initializePiNetwork(1);
  } catch {
    return false;
  }
};
