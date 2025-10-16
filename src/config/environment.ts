
/**
 * Environment configuration for the application
 * 
 * In a production environment, these values should be injected at build time
 * via environment variables or fetched from a secure backend service.
 */

import { SubscriptionTier } from '@/utils/piNetwork/types';

// Development configuration
export const DEV_CONFIG = {
  // Enable this to bypass Pi Network authentication during development
  // SECURITY: This is automatically disabled in production builds
  bypassAuth: import.meta.env.DEV, // Only bypass in development mode
  mockUser: {
    uid: "00000000-0000-0000-0000-000000000001", // Valid UUID format
    username: "Developer",
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

const isProduction = (): boolean => {
  if (typeof window !== 'undefined') {
    const host = window.location.host;
    // Only consider it production if it's on the actual deployed domains
    // .lovableproject.com is the Lovable sandbox/preview environment
    return (host.includes('lovable.app') || 
            host.includes('app.lovable.dev')) &&
           !host.includes('lovableproject.com');
  }
  return import.meta.env.PROD;
};

export const shouldBypassAuth = (): boolean => {
  if (isProduction()) {
    console.error('⚠️ SECURITY WARNING: Auth bypass attempted in production environment');
    return false;
  }
  
  if (DEV_CONFIG.bypassAuth) {
    console.warn('🔓 Development mode: Authentication bypass is active');
  }
  
  return DEV_CONFIG.bypassAuth;
};
