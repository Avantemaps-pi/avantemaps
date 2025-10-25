
/**
 * Helper utilities for Pi Network SDK interactions
 */

// Check if Pi Network SDK is available
export const isPiNetworkAvailable = (): boolean => {
  if (typeof window === "undefined") return false;

  const pi = (window as any).Pi;
  if (!pi) return false;

  // ✅ Make sure all key SDK methods exist
  const hasCoreMethods =
    typeof pi.init === "function" &&
    typeof pi.authenticate === "function" &&
    typeof pi.createPayment === "function";

  // ✅ Check if we’ve already marked SDK as ready
  const isInitialized = (window as any).__piInitialized === true;

  return hasCoreMethods && isInitialized;
};

// Check if a session is expired
export const isSessionExpired = (lastAuthenticated: number, timeout: number): boolean => {
  return Date.now() - lastAuthenticated > timeout;
};

// Detect Pi Browser environment
export const isPiBrowser = (): boolean => {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return false;
  }
  
  const userAgent = navigator.userAgent.toLowerCase();
  return userAgent.includes('pi browser') || userAgent.includes('minepi');
};

// Get browser environment details for debugging
export const getBrowserInfo = (): {
  isPi: boolean;
  userAgent: string;
  platform: string;
  vendor: string;
} => {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return {
      isPi: false,
      userAgent: 'unknown',
      platform: 'unknown',
      vendor: 'unknown'
    };
  }
  
  return {
    isPi: isPiBrowser(),
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    vendor: navigator.vendor
  };
};
