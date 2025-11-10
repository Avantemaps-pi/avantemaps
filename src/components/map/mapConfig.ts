
// Map configuration constants
export const defaultCenter = { lat: 0, lng: 0 }; // World center
export const defaultZoom = 2;
export const minZoom = 2;
export const maxZoom = 18;

// World boundary restrictions to prevent infinite scrolling
export const worldBounds: [[number, number], [number, number]] = [[-85, -180], [85, 180]];
export const maxBoundsViscosity = 1.0;

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
