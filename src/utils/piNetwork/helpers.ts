/**
 * Pi Network – helpers
 * Clean, safe utilities used by core.ts
 */

declare global {
  interface Window {
    Pi?: any;
    __piInitialized?: boolean;
  }
}

/**
 * Detects Pi Browser reliably.
 */
export const isPiBrowser = (): boolean => {
  try {
    if (typeof navigator === "undefined") return false;

    const ua = navigator.userAgent.toLowerCase();
    // Only use user agent detection - window.Pi exists even outside Pi Browser
    return (
      ua.includes("pibrowser") ||
      ua.includes("pi browser") ||
      ua.includes("minepi")
    );
  } catch {
    return false;
  }
};

/**
 * Returns basic browser diagnostics.
 */
export const getBrowserInfo = () => {
  try {
    const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";

    return {
      userAgent: ua,
      isPiBrowser: isPiBrowser(),
      platform:
        typeof navigator !== "undefined" ? navigator.platform : "unknown",
      vendor: typeof navigator !== "undefined" ? navigator.vendor : "unknown",
    };
  } catch {
    return {
      userAgent: "",
      isPiBrowser: false,
      platform: "unknown",
      vendor: "unknown",
    };
  }
};

/**
 * Determines if the Pi SDK is really available and initialized.
 */
export const isPiNetworkAvailable = (): boolean => {
  try {
    if (typeof window === "undefined") return false;

    // Allow test mode in preview/dev environments
    const host = window.location?.hostname || '';
    const isPreviewOrDev = 
      host === 'localhost' || 
      host === '127.0.0.1' || 
      host.includes('lovableproject.com') ||
      host.includes('preview');
    
    if (isPreviewOrDev) return true;

    const pi = (window as any).Pi;
    if (!pi) return false;

    const hasAuthMethod = typeof pi.authenticate === "function";
    const isInit = !!(window as any).__piInitialized;

    return hasAuthMethod && isInit;
  } catch {
    return false;
  }
};

/**
 * Session expiration util (used by auth logic in core.ts)
 */
export const isSessionExpired = (
  lastAuthenticated: number,
  timeout: number
): boolean => {
  try {
    return Date.now() - lastAuthenticated > timeout;
  } catch {
    return true;
  }
};
