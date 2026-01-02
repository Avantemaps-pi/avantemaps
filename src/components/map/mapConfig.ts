
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

// Marker colors based on verification status
export const MARKER_COLORS = {
  CERTIFIED: '%2322c55e',    // Green for certified (URL encoded #)
  VERIFIED: '%233b82f6',     // Blue for verified
  PENDING: '%23f59e0b',      // Amber/orange for pending verification
  DEFAULT: '%236b7280',      // Gray for unverified
  USER_BUSINESS: '%23eab308' // Gold for user's own businesses
};
