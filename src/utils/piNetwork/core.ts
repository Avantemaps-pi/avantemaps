// ======================
// Clean, Full-Feature core.ts
// ======================

import { SubscriptionTier } from './types';

/*********************************
 * Types
 *********************************/
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

/*********************************
 * Globals
 *********************************/
declare global {
  interface Window {
    Pi?: any;
    __piInitState?: {
      loading: boolean;
      loaded: boolean;
      error?: string | null;
      promise?: Promise<boolean> | null;
      scriptEl?: HTMLScriptElement | null;
      lastInitAttempt?: number;
    };
    __piAuthSession?: {
      user?: AuthResult['user'];
      lastAuthenticated?: number;
    } | null;
    __piInitialized?: boolean;
  }
}

/*********************************
 * Config
 *********************************/
const SDK_URL = 'https://sdk.minepi.com/pi-sdk.js';
const LOAD_TIMEOUT = 15000;
const INIT_TIMEOUT = 6000;
const RETRIES = 2;
const SESSION_KEY = 'avante_pi_auth_v1';

/*********************************
 * Core Class
 *********************************/
class PiNetworkCore {
  private initialized = false;
  private auth: AuthResult | null = null;
  private inProgressInit: Promise<boolean> | null = null;
  private incompleteHandler: ((p: PaymentDTO) => void) | null = null;

  /*********************************
   * SDK Loader
   *********************************/
  private async loadSdk(timeout = LOAD_TIMEOUT): Promise<boolean> {
    if (typeof window === 'undefined') return false;

    // Already loaded
    if (window.Pi) {
      window.__piInitState = { loading: false, loaded: true, scriptEl: null, promise: null };
      return true;
    }

    // If loading is already happening
    if (window.__piInitState?.promise) {
      return window.__piInitState.promise;
    }

    const script = document.createElement('script');
    script.src = SDK_URL;
    script.async = true;
    script.defer = true;

    const promise = new Promise<boolean>((resolve) => {
      let resolved = false;
      const finish = (ok: boolean) => {
        if (resolved) return;
        resolved = true;
        resolve(ok);
      };

      const t = setTimeout(() => finish(false), timeout);
      script.onload = () => {
        clearTimeout(t);
        finish(!!window.Pi);
      };
      script.onerror = () => {
        clearTimeout(t);
        finish(false);
      };
    });

    window.__piInitState = {
      loading: true,
      loaded: false,
      scriptEl: script,
      promise
    };

    document.head.appendChild(script);
    return promise;
  }

  /*********************************
   * Sandbox mode detection
   *********************************/
  public determineSandboxMode(): boolean {
    try {
      const h = window.location.hostname.toLowerCase();
      return (
        h.includes('localhost') ||
        h.includes('127.0.0.1') ||
        h.includes('dev') ||
        h.includes('staging') ||
        h.includes('test')
      );
    } catch {
      return false;
    }
  }

  /*********************************
   * Initialization
   *********************************/
  public async initialize(retries = RETRIES): Promise<boolean> {
    if (this.initialized) return true;
    if (this.inProgressInit) return this.inProgressInit;

    this.inProgressInit = (async () => {
      let attempt = 0;
      while (attempt <= retries) {
        attempt++;
        try {
          const loaded = await this.loadSdk();
          if (!loaded) {
            if (import.meta.env.DEV) {
              window.Pi = this.mockPi();
            } else continue;
          }

          if (!window.Pi) throw new Error('Pi SDK missing after load');

          // Init call
          const sandbox = this.determineSandboxMode();
          const initResult = window.Pi.init?.({ version: '2.0', sandbox });

          if (initResult?.then) {
            await Promise.race([
              initResult,
              new Promise((_, reject) => setTimeout(() => reject(new Error('init timeout')), INIT_TIMEOUT))
            ]);
          }

          if (typeof window.Pi.authenticate !== 'function') {
            throw new Error('Pi.authenticate missing');
          }

          this.initialized = true;
          window.__piInitialized = true;
          window.__piInitState = { loading: false, loaded: true, scriptEl: window.__piInitState?.scriptEl ?? null };

          this.restoreSession();
          this.setupReinitWatcher();

          return true;
        } catch {
          if (attempt > retries) break;
          await new Promise((r) => setTimeout(r, 300));
        }
      }

      window.__piInitialized = false;
      return false;
    })();

    const ok = await this.inProgressInit;
    this.inProgressInit = null;
    return ok;
  }

  /*********************************
   * Session
   *********************************/
  private restoreSession() {
    try {
      const raw = sessionStorage.getItem(SESSION_KEY);
      if (!raw) return;

      const parsed = JSON.parse(raw);
      if (!parsed?.user) return;

      const tooOld = parsed.lastAuthenticated && Date.now() - parsed.lastAuthenticated > 86400000;
      if (tooOld) {
        sessionStorage.removeItem(SESSION_KEY);
        return;
      }

      this.auth = {
        accessToken: '',
        user: parsed.user
      };
    } catch {}
  }

  private saveSession() {
    try {
      if (!this.auth) return sessionStorage.removeItem(SESSION_KEY);
      sessionStorage.setItem(
        SESSION_KEY,
        JSON.stringify({ user: this.auth.user, lastAuthenticated: Date.now() })
      );
    } catch {}
  }

  /*********************************
   * Re-init when returning to tab
   *********************************/
  private setupReinitWatcher() {
    const handler = async () => {
      if (!document.hidden && !this.initialized) {
        await this.initialize(1);
      }
    };
    document.addEventListener('visibilitychange', handler);
  }

  /*********************************
   * Auth
   *********************************/
  public async authenticate(scopes: string[] = ['username', 'payments', 'wallet_address']): Promise<AuthResult> {
    const ok = await this.initialize();
    if (!ok) throw new Error('Pi SDK init failed');

    const onIncomplete = (p: PaymentDTO) => {
      try {
        this.incompleteHandler?.(p);
        if (!this.incompleteHandler) sessionStorage.setItem('pi_incomplete_payment', JSON.stringify(p));
      } catch {}
    };

    const r = await window.Pi.authenticate(scopes, onIncomplete);
    if (!r?.user?.uid || !r.accessToken) throw new Error('Invalid auth result');

    this.auth = {
      accessToken: r.accessToken,
      user: {
        uid: r.user.uid,
        username: r.user.username,
        wallet_address: r.user.wallet_address,
        roles: r.user.roles || []
      }
    };

    this.saveSession();
    return this.auth;
  }

  /*********************************
   * Payments
   *********************************/
  public setIncompletePaymentHandler(handler: (p: PaymentDTO) => void) {
    this.incompleteHandler = handler;
  }

  public async createPayment(data: PaymentData, callbacks: PaymentCallbacks) {
    const ok = await this.initialize();
    if (!ok) throw new Error('Pi SDK not ready');
    if (!this.auth) throw new Error('User not authenticated');

    window.Pi.createPayment(data, callbacks);
  }

  /*********************************
   * Utilities
   *********************************/
  public getAuth(): AuthResult | null {
    return this.auth;
  }

  public isAuthenticated(): boolean {
    return !!this.auth;
  }

  public isSdkInitialized(): boolean {
    return this.initialized && !!window.Pi?.authenticate;
  }

  public clearAuth() {
    this.auth = null;
    sessionStorage.removeItem(SESSION_KEY);
  }

  private mockPi() {
    return {
      init: () => {},
      authenticate: async () => ({ user: { uid: 'dev', username: 'dev_user' }, accessToken: 'dev_token' }),
      createPayment: () => {}
    };
  }
}

/*********************************
 * Singleton & Exports
 *********************************/
export const piNetworkCore = new PiNetworkCore();

export const initializePiNetwork = (r = RETRIES) => piNetworkCore.initialize(r);
export const authenticateUser = (scopes?: string[]) => piNetworkCore.authenticate(scopes);
export const createPiPayment = (d: PaymentData, c: PaymentCallbacks) => piNetworkCore.createPayment(d, c);
export const setIncompletePaymentHandler = (h: (p: PaymentDTO) => void) => piNetworkCore.setIncompletePaymentHandler(h);
export const clearPiAuth = ()
