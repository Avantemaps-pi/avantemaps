
// Map configuration constants
export const defaultCenter = { lat: 37.7749, lng: -122.4194 }; // San Francisco
export const defaultZoom = 12;
export const minZoom = 3;
export const maxZoom = 18;

// World boundary restrictions to prevent infinite scrolling
export const worldBounds: [[number, number], [number, number]] = [[-85, -180], [85, 180]];
export const maxBoundsViscosity = 1.0;

// Google Maps API Key (replace with your own or use environment variables)
export const GOOGLE_MAPS_API_KEY = 'YOUR_API_KEY'; // This should ideally come from environment variables

// Tile layer configurations
export const OSM_TILE_LAYER = {
  url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  noWrap: true // Prevent tile wrapping
};

// Default marker colors for different business types
export const MARKER_COLORS = {
  DEFAULT: 'blue',
  RESTAURANT: 'red',
  RETAIL: 'green',
  SERVICES: 'orange',
  TECH: 'purple',
  HEALTH: 'pink',
  ENTERTAINMENT: 'yellow',
  EDUCATION: 'teal',
  USER_BUSINESS: 'gold'
};
