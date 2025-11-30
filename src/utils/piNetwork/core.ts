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

    /** ✅ NEW: Required by helpers.ts */
    __piInitialized?: boolean;
  }
}

/* ========== Configuration ========== */
const SDK_URL = 'https://sdk.minepi.com/pi-sdk.js';
const LOAD_TIMEOUT = 15_000;
const INIT_TIMEOUT = 6_000;
const DEFAULT_RETRY_ATTEMPTS = 2;
const SESSION_STORAGE_KEY = 'avante_pi_auth_v1';
/* =================================== */

class PiNetworkCore {
  private isInitialized = false;
  private authResult: AuthResult | null = null;
  private incompletePaymentHandler: ((p: PaymentDTO) => void) | null = null;
  private initInProgressPromise: Promise<boolean> | null = null;

  private async loadSdkScript(timeout = LOAD_TIMEOUT): Promise<boolean> {
    if (typeof window === 'undefined') return false;

    if (window.Pi) {
      window.__piInitState = window.__piInitState || {
        loading: false,
        loaded: true,
        error: null,
        scriptEl: null,
        promise: Promise.resolve(true)
      };
      return true;
    }

    if (window.__piInitState?.promise) {
      try {
        return await window.__piInitState.promise;
      } catch {}
    }

    const existing = document.querySelector<HTMLScriptElement>('script[src*="pi-sdk.js"]');

    let externallyResolved = false;
    const promise = new Promise<boolean>((resolve) => {
      const cleanupResolve = (val: boolean) => {
        if (externallyResolved) return;
        externallyResolved = true;
        window.__piInitState = window.__piInitState || {
          loading: false,
          loaded: val,
          error: val ? null : 'load_failed',
          scriptEl: existing ?? null,
          promise: undefined
        };
        resolve(val);
      };

      const t = setTimeout(() => cleanupResolve(false), timeout);

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
        window.__piInitState = {
          loading: true,
          loaded: false,
          error: null,
          scriptEl: script,
          promise: undefined
        };
      }
    });

    window.__piInitState = window.__piInitState || {
      loading: true,
      loaded: false,
      error: null,
      scriptEl: null,
      promise
    };
    window.__piInitState.promise = promise;
    return await promise;
  }

  public determineSandboxMode(): boolean {
    try {
      if (typeof window === 'undefined') return false;
      const hostname = (window.location?.hostname || '').toLowerCase();
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
            if (import.meta.env.DEV) {
              // @ts-ignore
              window.Pi = window.Pi || {
                init: () => {},
                authenticate: async () => ({ user: { uid: 'dev', username: 'dev_user' }, accessToken: 'dev_token' }),
                createPayment: () => {}
              };
            } else {
              continue;
            }
          }

          if (!window.Pi) {
            if (import.meta.env.DEV) {
              // @ts-ignore
              window.Pi = {
                init: () => {},
                authenticate: async () => ({ user: { uid: 'dev', username: 'dev_user' }, accessToken: 'dev_token' }),
                createPayment: () => {}
              };
            } else {
              throw new Error('Pi SDK not present after loading');
            }
          }

          const sandbox = this.determineSandboxMode();
          try {
            const maybe = window.Pi.init?.({ version: '2.0', sandbox });
            if (maybe?.then) {
              await Promise.race([
                maybe,
                new Promise((_, reject) => setTimeout(() => reject(new Error('Pi.init timed out')), INIT_TIMEOUT))
              ]);
            } else {
              await new Promise((res) => setTimeout(res, 250));
            }
          } catch (e) {
            throw e;
          }

          if (typeof window.Pi.authenticate !== 'function') {
            throw new Error('Pi SDK did not expose authenticate()');
          }

          this.isInitialized = true;

          window.__piInitState = window.__piInitState || {
            loading: false,
            loaded: true,
            error: null,
            scriptEl: window.__piInitState?.scriptEl ?? null,
            promise: undefined
          };
          window.__piInitState.loaded = true;
          window.__piInitState.lastInitAttempt = Date.now();

          this.tryRestoreSession();
          this.setupAutoReinit();

          /** ✅ NEW: helpers.ts requires this */
          window.__piInitialized = true;

          return true;
        } catch (err) {
          if (attempt <= retries) await new Promise((r) => setTimeout(r, 300));
        }
      }

      this.isInitialized = false;

      window.__piInitState = window.__piInitState || {
        loading: false,
        loaded: false,
        error: 'init_failed',
        scriptEl: window.__piInitState?.scriptEl ?? null,
        promise: undefined
      };
      window.__piInitState.loaded = false;

      /** ❌ Initialization failed → mark false */
      window.__piInitialized = false;

      return false;
    })();

    const result = await this.initInProgressPromise;
    this.initInProgressPromise = null;
    return result;
  }

  private tryRestoreSession(): void {
    try {
      if (typeof window === 'undefined') return;
      const raw = sessionStorage.getItem(SESSION_STORAGE_KEY);
      if (!raw) return;

      const parsed = JSON.parse(raw);
      if (!parsed?.user) return;

      if (parsed.lastAuthenticated && Date.now() - parsed.lastAuthenticated > 24 * 60 * 60 * 1000) {
        sessionStorage.removeItem(SESSION_STORAGE_KEY);
        return;
      }

      this.authResult = {
        accessToken: '',
        user: {
          uid: parsed.user.uid,
          username: parsed.user.username,
          wallet_address: parsed.user.wallet_address,
          roles: parsed.user.roles || []
        }
      };
    } catch {}
  }

  private persistSession(): void {
    try {
      if (!this.authResult?.user) {
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
    } catch {}
  }

  private setupAutoReinit(): void {
    try {
      if (typeof window === 'undefined') return;
      const handler = async () => {
        if (!document.hidden && !this.isInitialized) {
          try {
            await this.initialize(1);
          } catch {}
        }
      };
      window.removeEventListener('visibilitychange', handler);
      window.addEventListener('visibilitychange', handler);
    } catch {}
  }

  public async authenticate(scopes: string[] = ['username', 'payments', 'wallet_address']): Promise<AuthResult> {
    try {
      const ok = await this.initialize(DEFAULT_RETRY_ATTEMPTS);
      if (!ok) throw new Error('Pi SDK initialization failed');

      if (!window.Pi?.authenticate) throw new Error('Pi SDK authenticate() unavailable');

      const onIncompletePayment = (payment: PaymentDTO) => {
        try {
          this.incompletePaymentHandler?.(payment);
          if (!this.incompletePaymentHandler) {
            sessionStorage.setItem('pi_incomplete_payment', JSON.stringify(payment));
          }
        } catch {}
      };

      const auth = await window.Pi.authenticate(scopes, onIncompletePayment);

      if (!auth?.user?.uid || !auth.accessToken) {
        throw new Error('Authentication returned incomplete result');
      }

      this.authResult = {
        accessToken: auth.accessToken,
        user: {
          uid: auth.user.uid,
          username: auth.user.username,
          wallet_address: auth.user.wallet_address,
          roles: auth.user.roles || []
        }
      };

      this.persistSession();
      return this.authResult;
    } catch (err) {
      return Promise.reject(err instanceof Error ? err : new Error(String(err)));
    }
  }

  public setIncompletePaymentHandler(handler: (p: PaymentDTO) => void): void {
    this.incompletePaymentHandler = handler;
  }

  public async createPayment(paymentData: PaymentData, callbacks: PaymentCallbacks): Promise<void> {
    try {
      if (!this.isInitialized) {
        const ok = await this.initialize(1);
        if (!ok) throw new Error('Pi SDK not initialized');
      }
      if (!this.authResult) throw new Error('User not authenticated');
      if (!window.Pi?.createPayment) throw new Error('Pi.createPayment missing');

      window.Pi.createPayment(paymentData, {
        onReadyForServerApproval: callbacks.onReadyForServerApproval,
        onReadyForServerCompletion: callbacks.onReadyForServerCompletion,
        onCancel: callbacks.onCancel,
        onError: callbacks.onError
      });
    } catch (e) {
      return Promise.reject(e);
    }
  }

  public getAuthResult(): AuthResult | null {
    return this.authResult;
  }

  public isAuthenticated(): boolean {
    return !!this.authResult?.user;
  }

  public isSdkInitialized(): boolean {
    return (
      this.isInitialized &&
      !!(typeof window !== 'undefined' && window.Pi && typeof window.Pi.authenticate === 'function')
    );
  }

  public clearAuth(): void {
    this.authResult = null;
    try {
      sessionStorage.removeItem(SESSION_STORAGE_KEY);
    } catch {}
  }
}

/* ========== Singleton + wrapper exports ========== */
export const piNetworkCore = new PiNetworkCore();

export const initializePiNetwork = async (retries = DEFAULT_RETRY_ATTEMPTS): Promise<boolean> => {
  try {
    if (typeof window === 'undefined') return false;

    if (!window.Pi && import.meta.env.DEV) {
      // @ts-ignore
      window.Pi = {
        init: () => {},
        authenticate: async () => ({ user: { uid: 'dev', username: 'dev_user' }, accessToken: 'dev_token' }),
        createPayment: () => {}
      };
    }

    return await piNetworkCore.initialize(retries);
  } catch {
    return false;
  }
};

export const authenticateUser = (scopes: string[] = ['username', 'payments', 'wallet_address']) =>
  piNetworkCore.authenticate(scopes);

export const createPiPayment = (data: PaymentData, callbacks: PaymentCallbacks) =>
  piNetworkCore.createPayment(data, callbacks);

export const isUserAuthenticated = () => piNetworkCore.isAuthenticated();

export const setIncompletePaymentHandler = (handler: (p: PaymentDTO) => void) =>
  piNetworkCore.setIncompletePaymentHandler(handler);

export const clearPiAuth = () => piNetworkCore.clearAuth();

export const getPiAuthResult = () => piNetworkCore.getAuthResult();

export const determineSandboxMode = () => piNetworkCore.determineSandboxMode();

/* === Legacy compatibility === */
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

export const forceSdkReinitialization = async () => {
  try {
    piNetworkCore.clearAuth();
    return await initializePiNetwork(1);
  } catch {
    return false;
  }
};
