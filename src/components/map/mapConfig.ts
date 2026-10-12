
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

// Pin colors (hex because pins are SVG data URIs, which can't read CSS variables).
// Status is told apart by shape and lightness, not hue.
export const PIN_COLORS = {
  PRIMARY: '#2563eb',    // Your business ring/dot, verified body
  NAVY: '#1e3a8a',       // Certified body
  WHITE: '#ffffff',
  PENDING: '#7b8ba3',    // Dashed outline + dot for pending verification
  UNVERIFIED: '#64748b', // Unverified body
};
