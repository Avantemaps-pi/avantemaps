
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
  bypassAuth: true, // Always bypass in development for unrestricted access
  mockUser: {
    uid: "dev-user-123",
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
// Note: Google Maps JavaScript API keys are designed to be used in client-side code
// and should be restricted by HTTP referrers in the Google Cloud Console
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
