
/**
 * Environment configuration for the application
 * 
 * In a production environment, these values should be injected at build time
 * via environment variables or fetched from a secure backend service.
 */

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
