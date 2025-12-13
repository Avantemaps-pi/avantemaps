
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

// PRODUCTION MODE: All environments require real Pi Browser authentication
// No test mode, no preview fallbacks - Pi Browser only

export const shouldBypassAuth = (): boolean => {
  // PRODUCTION: Never bypass authentication
  // Real Pi Browser authentication is always required
  console.log('🔒 Production mode: Real Pi Browser authentication required');
  return false;
};
