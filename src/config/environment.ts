
/**
 * Environment configuration for the application
 *
 * In a production environment, these values should be injected at build time
 * via environment variables or fetched from a secure backend service.
 */

import { SubscriptionTier } from '@/utils/piNetwork/types';

/**
 * Exact hostnames that should run the Pi SDK against real Pi Network mainnet
 * (sandbox: false). Every other hostname (localhost, previews, testnet.avantemaps.com,
 * etc.) runs sandboxed. Exact-match only — do NOT switch this back to a suffix/includes
 * check, since "endsWith('.avantemaps.com')" previously misclassified
 * testnet.avantemaps.com as mainnet.
 *
 * Single source of truth: consumed by src/routes/__root.tsx's inline PI_INIT_SCRIPT
 * (interpolated at build time, since that script runs before the JS bundle loads and
 * can't import this at runtime) and by the runtime fallback in
 * src/utils/piNetwork/core.ts's determineSandboxMode(). Add new mainnet hostnames here
 * only — never re-hardcode a second list.
 */
export const MAINNET_PI_HOSTNAMES = ['avantemaps.com', 'mainnet.avantemaps.com'] as const;

export const isMainnetPiHost = (hostname: string): boolean =>
  (MAINNET_PI_HOSTNAMES as readonly string[]).includes(hostname);

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

// Development configuration - only available in development builds
// SECURITY: This entire object is undefined in production builds
export const DEV_CONFIG = import.meta.env.DEV ? {
  // Enable this to bypass Pi Network authentication during development
  // SECURITY: This is automatically disabled in production builds
  bypassAuth: true,
  mockUser: {
    // Use fake UUIDs that don't exist in production database
    uid: "00000000-0000-0000-0000-000000000001", // Fake development UUID
    pi_uid: "dev-test-pi-uid", // Fake Pi Network UID
    username: "DevTestUser", // Generic development username
    walletAddress: "dev-test-wallet",
    roles: ["user"],
    accessToken: "dev-access-token",
    lastAuthenticated: Date.now(),
    subscriptionTier: SubscriptionTier.ORGANIZATION, // Using the highest tier for dev access
    businessCount: 5
  }
} : undefined;

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

/**
 * Check if authentication should be bypassed (test mode)
 * Only enabled for Lovable preview domains to allow debugging
 * Production deployments always require real Pi authentication
 */
export const shouldBypassAuth = (): boolean => {
  // SSR safety: no window on the server — never bypass during server render
  if (typeof window === 'undefined') return false;
  const hostname = window.location.hostname;
  
  // Allow test mode ONLY on Lovable preview/project domains (NOT the published app)
  if (hostname.includes('lovableproject.com') || hostname.includes('id-preview')) {
    console.log('🧪 Preview environment: Test mode enabled');
    return true;
  }
  
  // Production and published domains: never bypass
  console.log('🔒 Production mode: Real Pi Browser authentication required');
  return false;
};

// Mock user for test mode only
export const getMockUser = () => {
  if (!shouldBypassAuth()) return null;
  return DEV_CONFIG?.mockUser ?? null;
};
