
/**
 * Environment configuration for the application
 * 
 * In a production environment, these values should be injected at build time
 * via environment variables or fetched from a secure backend service.
 */

import { SubscriptionTier } from '@/utils/piNetwork/types';

// Build-time security check: Ensure auth bypass is never enabled in production builds
if (import.meta.env.PROD) {
  const authBypassEnabled = import.meta.env.DEV; // Should always be false in PROD
  if (authBypassEnabled) {
    throw new Error(
      '🚨 CRITICAL SECURITY ERROR: Authentication bypass is enabled in a production build! ' +
      'This is a severe security vulnerability. Build failed.'
    );
  }
}

// Development configuration
export const DEV_CONFIG = {
  // Enable this to bypass Pi Network authentication during development
  // SECURITY: This is automatically disabled in production builds
  // CRITICAL: Remove this entire config before deploying to production
  bypassAuth: import.meta.env.DEV && import.meta.env.VITE_ALLOW_AUTH_BYPASS !== 'false', // Only bypass in development mode
  mockUser: {
    uid: "79f9f9a7-a8b8-4724-9f04-51a58c183899", // Match the actual business owner in database
    pi_uid: "dev-mock-pi-uid", // Pi Network UID
    username: "JordynDaniel", // Fixed: Must match the username for this uid in database
    walletAddress: "dev-wallet-address",
    roles: ["user"],
    accessToken: "dev-access-token",
    lastAuthenticated: Date.now(),
    subscriptionTier: SubscriptionTier.ORGANIZATION, // Using the highest tier for dev access
    businessCount: 5
  }
};

// Map configuration (using OpenStreetMap via Leaflet)
export const MAPS_CONFIG = {
  defaultCenter: {
    lat: 37.7749,
    lng: -122.4194,
  },
  defaultZoom: 13,
};

// Development mode helpers with production safety checks
export const isDevelopmentMode = (): boolean => import.meta.env.DEV;

// Check if we're in a preview/sandbox environment (allows test mode)
// Only localhost and lovableproject.com are considered preview - custom domains use production
const isPreviewEnvironment = (): boolean => {
  if (typeof window === 'undefined') return false;
  const host = window.location.host;
  return host.includes('lovableproject.com') || 
         host.includes('localhost') || 
         host.includes('127.0.0.1');
};

const isProduction = (): boolean => {
  if (typeof window !== 'undefined') {
    const host = window.location.host;
    // Production includes deployed domains AND custom domains (like testnet.avantemaps.com)
    // Only lovableproject.com, localhost are NOT production
    const isDevHost = host.includes('lovableproject.com') || 
                      host.includes('localhost') || 
                      host.includes('127.0.0.1');
    return !isDevHost;
  }
  return import.meta.env.PROD;
};

// Check if running in Pi Browser - ONLY use user agent detection
// window.Pi exists even outside Pi Browser (SDK loads globally), so we can't rely on it
const isPiBrowserEnvironment = (): boolean => {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent.toLowerCase();
  return ua.includes('pibrowser') || ua.includes('pi browser') || ua.includes('minepi');
};

export const shouldBypassAuth = (): boolean => {
  // Triple-layer protection against production bypass
  if (isProduction()) {
    // Even in production, if NOT in Pi Browser, allow test mode
    // because real Pi auth is impossible anyway
    if (!isPiBrowserEnvironment()) {
      console.warn('🔓 Not in Pi Browser (production): Falling back to test mode');
      return true;
    }
    console.error('⚠️ SECURITY WARNING: Auth bypass attempted in production Pi Browser');
    return false;
  }
  
  // Allow test mode in preview/dev environments
  if (isPreviewEnvironment()) {
    console.warn('🔓 Preview mode: Using test authentication');
    return true;
  }
  
  // Not in Pi Browser anywhere = allow test mode
  if (!isPiBrowserEnvironment()) {
    console.warn('🔓 Not in Pi Browser: Falling back to test mode');
    return true;
  }
  
  if (import.meta.env.PROD && !isPreviewEnvironment()) {
    console.error('⚠️ SECURITY WARNING: Auth bypass attempted in production build');
    return false;
  }
  
  if (DEV_CONFIG.bypassAuth) {
    console.warn('🔓 Development mode: Authentication bypass is active');
    console.warn('⚠️  This feature must be disabled before production deployment');
  }
  
  return DEV_CONFIG.bypassAuth;
};
