/**
 * src/utils/piNetwork/helpers.ts
 * Safe, consistent helpers used by the Pi Network core module.
 */

declare global {
  interface Window {
    Pi?: any;
    __piInitialized?: boolean;
  }
}

/**
 * Detect whether the app is running inside the Pi Browser.
 * - Uses safe user-agent checks
 * - Also checks window.Pi existence
 */
export const isPiBrowser = (): boolean => {
  try {
    if (typeof navigator === "undefined") return false;

    const ua = navigator.userAgent || "";
    return (
      /PiBrowser|Pi Browser|Minepi|minepi/i.test(ua) ||
      (typeof window !== "undefined" && !!window.Pi)
    );
  } catch {
    return false;
  }
};

/**
 * Returns detailed browser info for debugging.
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
 * isPiNetworkAvailable():
 * - Ensures window.Pi exists
 * - Ensures authenticate() exists (core requirement)
 * - Ensures initialize() was successfully executed
 */
export const isPiNetworkAvailable = (): boolean => {
  try {
    if (typeof window === "undefined") return false;

    const pi = window.Pi;
    if (!pi) return false;

    const hasAuth = typeof pi.authenticate === "function";
    const initialized = !!window.__piInitialized;

    return hasAuth && initialized;
  } catch {
    return false;
  }
};

/**
 * Checks if session expired based on timestamp + timeout
 */
export const isSessionExpired = (
  lastAuthenticated: number,
  timeout: number
): boolean => {
  return Date.now() - lastAuthenticated > timeout;
};
