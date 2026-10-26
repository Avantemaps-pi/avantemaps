// Remembers that the user allowed GPS, for browsers without a Permissions API
// (permission state reads 'unknown'). Set when GPS succeeds, cleared on
// PERMISSION_DENIED and by Settings when "Use my location" is turned off.
const GRANTED_KEY = 'geolocation_granted';

export const hasGranted = () => {
  try { return localStorage.getItem(GRANTED_KEY) === '1'; } catch { return false; }
};

export const markGranted = () => {
  try { localStorage.setItem(GRANTED_KEY, '1'); } catch { /* ignore */ }
};

export const clearGranted = () => {
  try { localStorage.removeItem(GRANTED_KEY); } catch { /* ignore */ }
};

// Set by LeafletMap when its sign-in GPS auto-centre fails, so
// useIpLocationFocus can fall back to the IP location once.
export const GPS_AUTOCENTRE_FAILED_KEY = 'gps_autocentre_failed';
export const GPS_AUTOCENTRE_FAILED_EVENT = 'gps-autocentre-failed';

/**
 * Whether the map can centre on GPS at sign-in without prompting:
 * "Use my location" is on and either permission is 'granted', or the
 * browser can't report it and GPS was allowed before.
 */
export async function canAutoCentreWithGps(): Promise<boolean> {
  if (typeof navigator === 'undefined' || !navigator.geolocation) return false;
  try {
    if (localStorage.getItem('use_location_focus') === '0') return false;
  } catch {
    // storage unavailable — setting defaults to on
  }
  if (!navigator.permissions?.query) return hasGranted();
  try {
    const status = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
    return status.state === 'granted';
  } catch {
    return hasGranted();
  }
}
