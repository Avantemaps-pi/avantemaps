/**
 * Environment configuration for the application
 */

import { SubscriptionTier } from '@/utils/piNetwork/types';

// Build-time safety: Prevent auth bypass in production
if (import.meta.env.PROD && import.meta.env.VITE_ALLOW_AUTH_BYPASS === 'true') {
  // In production builds we never allow auth bypass; ignore the flag and warn instead of crashing
  // This prevents white screens due to misconfigured env while keeping bypass disabled
  console.error('CRITICAL SECURITY WARNING: VITE_ALLOW_AUTH_BYPASS=true detected in production. Ignoring and enforcing authentication.');
}

// Development configuration
export const DEV_CONFIG = {
  bypassAuth:
    import.meta.env.DEV &&
    import.meta.env.VITE_ALLOW_AUTH_BYPASS !== 'false', // Safe default: disabled in production
  mockUser: {
    uid: '79f9f9a7-a8b8-4724-9f04-51a58c183899',
    username: 'Developer',
    walletAddress: 'dev-wallet-address',
    roles: ['user'],
    accessToken: 'dev-access-token',
    lastAuthenticated: Date.now(),
    subscriptionTier: SubscriptionTier.ORGANIZATION,
    businessCount: 5,
  },
};

// Map configuration
export const MAPS_CONFIG = {
  defaultCenter: { lat: 37.7749, lng: -122.4194 },
  defaultZoom: 13,
};

export const isDevelopmentMode = (): boolean => import.meta.env.DEV;

const isProduction = (): boolean => {
  // Only allow auth bypass in true local development
  return !import.meta.env.DEV;
};

/**
 * Determines whether to bypass Pi authentication.
 * ONLY works in local development (npm run dev).
 */
export const shouldBypassAuth = (): boolean => {
  // Only bypass in true local dev mode
  if (!import.meta.env.DEV) {
    return false;
  }

  if (DEV_CONFIG.bypassAuth) {
    console.warn('🔓 Local development mode: Authentication bypass is active');
  }

  return DEV_CONFIG.bypassAuth;
};
