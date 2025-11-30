/**
 * src/utils/piNetwork/helpers.ts
 * Robust helpers for Pi presence checks and debug info.
 */

declare global {
  interface Window {
    Pi?: any;
    __piInitialized?: boolean;
  }
}

export const isPiBrowser = (): boolean => {
  try {
    if (typeof navigator === 'undefined') return false;
    const ua = navigator.userAgent || '';
    // match common tokens, case-insensitive
    return /PiBrowser|Pi Browser|Minepi|minepi/i.test(ua) || !!(window && (window as any).Pi);
  } catch {
    return false;
  }
};

export const getBrowserInfo = () => {
  try {
    const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
    return {
      userAgent: ua,
      isPiBrowser: isPiBrowser(),
      platform: typeof navigator !== 'undefined' ? navigator.platform : 'unknown',
      vendor: typeof navigator !== 'undefined' ? navigator.vendor : 'unknown'
    };
  } catch {
    return { userAgent: '', isPiBrowser: false, platform: 'unknown', vendor: 'unknown' };
  }
};

/**
 * isPiNetworkAvailable:
 * - checks that window.Pi exists
 * - checks that authenticate() is present (the essential RW method)
 * - checks the global __piInitialized flag (set by core initialize())
 */
export const isPiNetworkAvailable = (): boolean => {
  try {
    if (typeof window === 'undefined') return false;
    const pi = (window as any).Pi;
    if (!pi) return false;
    const hasAuth = typeof pi.authenticate === 'function';
    const initialized = !!(window as any).__piInitialized;
    return hasAuth && initialized;
  } catch {
    return false;
  }
};

export const isSessionExpired = (lastAuthenticated: number, timeout: number): boolean => {
  return Date.now() - lastAuthenticated > timeout;
};
