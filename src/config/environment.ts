/**
 * Environment configuration for the application
 */

import { SubscriptionTier } from '@/utils/piNetwork/types';

// Build-time safety: Prevent auth bypass in production
if (import.meta.env.PROD && import.meta.env.VITE_ALLOW_AUTH_BYPASS === 'true') {
  throw new Error(
    '🚨 CRITICAL SECURITY ERROR: Auth bypass is enabled in a production build!'
  );
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
  if (typeof window !== 'undefined') {
    const host = window.location.host;
    return (
      (host.includes('avantemaps.app') || // ✅ your production domain
        host.includes('lovable.app') ||
        host.includes('app.lovable.dev')) &&
      !host.includes('lovableproject.com')
    );
  }
  return import.meta.env.PROD;
};

/**
 * Determines whether to bypass Pi authentication.
 * In production, this always returns false silently.
 */
export const shouldBypassAuth = (): boolean => {
  if (isProduction()) {
    // No need to log this in production — just enforce false
    return false;
  }

  if (import.meta.env.PROD) {
    return false;
  }

  if (DEV_CONFIG.bypassAuth) {
    console.warn('🔓 Development mode: Authentication bypass is active');
  }

  return DEV_CONFIG.bypassAuth;
};
