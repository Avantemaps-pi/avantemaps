
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

// Maps API configuration
// SECURITY WARNING: This Google Maps API key is exposed in client-side code.
// Google Maps JavaScript API keys are designed to be used client-side, but MUST be protected.
// 
// REQUIRED SECURITY MEASURES (configure in Google Cloud Console):
// 1. HTTP Referrer Restrictions: Limit to your domains (e.g., yourdomain.com/*, *.lovable.app/*)
// 2. API Restrictions: Restrict to only Maps JavaScript API and Geocoding API
// 3. Usage Quotas: Set up billing alerts and quotas to prevent abuse
// 4. Key Rotation: Rotate this key if it's been exposed without restrictions
//
// To configure: Google Cloud Console → APIs & Services → Credentials → Select this key
export const MAPS_CONFIG = {
  apiKey: "AIzaSyAp6za1pf11Tvq80kIRBpqqunXg4AcYa8s",
  defaultCenter: {
    lat: 37.7749,
    lng: -122.4194,
  },
  defaultZoom: 13,
};

// Function to validate that required configuration exists
export const validateEnvConfig = (): boolean => {
  if (!MAPS_CONFIG.apiKey) {
    console.error("Missing Google Maps API key in environment configuration");
    return false;
  }
  return true;
};

// Development mode helpers
export const isDevelopmentMode = (): boolean => import.meta.env.DEV;
export const shouldBypassAuth = (): boolean => DEV_CONFIG.bypassAuth;
