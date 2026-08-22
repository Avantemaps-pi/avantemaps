import React, { useState } from 'react';
import { LocateFixed, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { secureLog } from '@/utils/secureLogger';

const isPiBrowser = () => typeof window !== 'undefined' && !!(window as any).Pi;
const logCtx = () => ({
  isPiBrowser: isPiBrowser(),
  userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
  online: typeof navigator !== 'undefined' ? navigator.onLine : null,
});

const CACHE_KEY = 'ip_location_cache_v1';
const TTL_MS = 24 * 60 * 60 * 1000;
const TOAST_ID = 'locate-me';

interface CachedLocation { lat: number; lng: number; ts: number }

const dispatchCenter = (lat: number, lng: number) => {
  window.dispatchEvent(new CustomEvent('centerMap', { detail: { lat, lng } }));
};

// CORS-friendly IP fallback (ipwho.is free plan blocks CORS)
const fetchIpLocation = async (): Promise<{ lat: number; lng: number } | null> => {
  const endpoints: Array<{ name: string; fn: () => Promise<{ lat: number; lng: number } | null> }> = [
    {
      name: 'ipapi.co',
      fn: async () => {
        const r = await fetch('https://ipapi.co/json/');
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const d = await r.json();
        if (typeof d.latitude === 'number' && typeof d.longitude === 'number') {
          return { lat: d.latitude, lng: d.longitude };
        }
        return null;
      },
    },
    {
      name: 'geojs.io',
      fn: async () => {
        const r = await fetch('https://get.geojs.io/v1/ip/geo.json');
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const d = await r.json();
        const lat = parseFloat(d.latitude);
        const lng = parseFloat(d.longitude);
        if (!isNaN(lat) && !isNaN(lng)) return { lat, lng };
        return null;
      },
    },
  ];
  for (const { name, fn } of endpoints) {
    try {
      const res = await fn();
      if (res) {
        secureLog.info('LocateMe: IP fallback succeeded', { provider: name, ...logCtx() });
        return res;
      }
      secureLog.warn('LocateMe: IP fallback returned no coords', { provider: name, ...logCtx() });
    } catch (err: any) {
      secureLog.warn('LocateMe: IP fallback provider failed', {
        provider: name,
        error: err?.message || String(err),
        ...logCtx(),
      });
    }
  }
  return null;
};

const readUseLocationPref = () => {
  try {
    return localStorage.getItem('use_location_focus') !== '0';
  } catch {
    return true;
  }
};

const readUseDeviceGps = () => {
  try {
    return localStorage.getItem('use_device_gps') === '1';
  } catch {
    return false;
  }
};

// Tracks whether we've ever surfaced the browser's geolocation prompt to the
// user. We only show it once — either the first time they ever use the
// feature, or after they re-enable a location setting that had been turned
// off. Subsequent clicks silently fall back to IP-based location.
const PROMPTED_KEY = 'geolocation_prompted';
const hasPrompted = () => {
  try { return localStorage.getItem(PROMPTED_KEY) === '1'; } catch { return false; }
};
const markPrompted = () => {
  try { localStorage.setItem(PROMPTED_KEY, '1'); } catch { /* ignore */ }
};
const LocateMeButton: React.FC<{ className?: string }> = ({ className }) => {
  const [loading, setLoading] = useState(false);
  // SSR-safe deterministic defaults; real prefs hydrate from localStorage in
  // the mount effect below so server and first client render stay identical.
  const [enabled, setEnabled] = useState<boolean>(true);
  const [gpsOptIn, setGpsOptIn] = useState<boolean>(false);

  React.useEffect(() => {
    const sync = () => {
      setEnabled(readUseLocationPref());
      setGpsOptIn(readUseDeviceGps());
    };
    sync();
    window.addEventListener('storage', sync);
    window.addEventListener('use_location_focus_changed', sync as EventListener);
    window.addEventListener('use_device_gps_changed', sync as EventListener);
    return () => {
      window.removeEventListener('storage', sync);
      window.removeEventListener('use_location_focus_changed', sync as EventListener);
      window.removeEventListener('use_device_gps_changed', sync as EventListener);
    };
  }, []);

  if (!enabled) return null;
  const useIpFallback = async () => {
    toast.loading('Resolving your approximate location…', {
      id: TOAST_ID,
      description: 'Using IP-based location.',
    });
    const res = await fetchIpLocation();
    if (res) {
      localStorage.setItem(CACHE_KEY, JSON.stringify({ ...res, ts: Date.now() }));
      dispatchCenter(res.lat, res.lng);
      toast.success('Centered on your approximate location', { id: TOAST_ID });
    } else {
      secureLog.error('LocateMe: all IP fallback providers failed', logCtx());
      toast.error("Couldn't determine your location", {
        id: TOAST_ID,
        description: 'Network or service error. Check your connection and try again.',
      });
    }
  };

  const usePreciseLocation = () =>
    new Promise<boolean>((resolve) => {
      if (!('geolocation' in navigator)) {
        secureLog.warn('LocateMe: geolocation API unavailable', logCtx());
        resolve(false);
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          secureLog.info('LocateMe: precise geolocation succeeded', {
            accuracy: pos.coords.accuracy,
            ...logCtx(),
          });
          dispatchCenter(latitude, longitude);
          toast.success('Centered on your location', { id: TOAST_ID });
          resolve(true);
        },
        (err) => {
          const codeName =
            err.code === err.PERMISSION_DENIED ? 'PERMISSION_DENIED'
            : err.code === err.POSITION_UNAVAILABLE ? 'POSITION_UNAVAILABLE'
            : err.code === err.TIMEOUT ? 'TIMEOUT'
            : `UNKNOWN_${err.code}`;
          secureLog.warn('LocateMe: precise geolocation failed', {
            code: err.code,
            codeName,
            message: err.message,
            ...logCtx(),
          });
          if (err.code === err.PERMISSION_DENIED) {
            toast.message('Location permission denied', {
              id: TOAST_ID,
              description: 'Falling back to approximate IP-based location.',
            });
          }
          resolve(false);
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
      );
    });

  const handleClick = async () => {
    if (loading) return;
    setLoading(true);

    try {
      secureLog.info('LocateMe: clicked', { gpsOptIn, ...logCtx() });

      // Only use precise device GPS when the user has explicitly opted in
      if (gpsOptIn) {
        // Check permission state first
        let permissionState: PermissionState | 'unknown' = 'unknown';
        try {
          if (navigator.permissions?.query) {
            const status = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
            permissionState = status.state;
          }
        } catch (err: any) {
          secureLog.debug('LocateMe: permissions.query threw', { error: err?.message });
        }
        secureLog.info('LocateMe: permission state', { permissionState, ...logCtx() });

        if (permissionState === 'denied') {
          secureLog.warn('LocateMe: geolocation permission denied — using IP fallback', logCtx());
        }

        // Show the browser prompt only when:
        //   - permission is already 'granted' (no prompt actually shown), OR
        //   - permission is 'prompt' AND we have never asked before / the
        //     user just re-enabled the setting (flag cleared by Settings).
        const shouldRequest =
          permissionState === 'granted' ||
          (permissionState === 'prompt' && !hasPrompted()) ||
          (permissionState !== 'denied' && permissionState !== 'prompt' && !hasPrompted());

        if (shouldRequest && 'geolocation' in navigator) {
          toast.loading(
            permissionState === 'granted' ? 'Getting your location…' : 'Requesting location permission…',
            { id: TOAST_ID, description: permissionState === 'prompt' ? 'Please allow location access in the prompt.' : undefined }
          );
          if (permissionState !== 'granted') markPrompted();
          const ok = await usePreciseLocation();
          if (ok) return;
        } else if (permissionState === 'prompt' && hasPrompted()) {
          secureLog.info('LocateMe: skipping repeat geolocation prompt — using IP fallback', logCtx());
        }
      }

      // Fallback: cached IP location
      try {
        const raw = localStorage.getItem(CACHE_KEY);
        if (raw) {
          const cached: CachedLocation = JSON.parse(raw);
          if (Date.now() - cached.ts < TTL_MS) {
            dispatchCenter(cached.lat, cached.lng);
            toast.success('Centered on your approximate location', { id: TOAST_ID });
            return;
          }
        }
      } catch {
        // ignore
      }

      await useIpFallback();
    } finally {
      setLoading(false);
    }
  };

  const handleClickRef = React.useRef(handleClick);
  React.useEffect(() => { handleClickRef.current = handleClick; });
  React.useEffect(() => {
    const trigger = () => { handleClickRef.current?.(); };
    window.addEventListener('trigger-locate-me', trigger as EventListener);
    return () => window.removeEventListener('trigger-locate-me', trigger as EventListener);
  }, []);

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      aria-label={loading ? 'Resolving your location' : 'Locate me'}
      aria-busy={loading}
      title={loading ? 'Resolving your location…' : 'Locate me'}
      className={cn(
        'h-10 w-10 rounded-full bg-background/95 backdrop-blur-xs border border-border shadow-md flex items-center justify-center text-foreground hover:bg-accent transition-colors disabled:opacity-70 disabled:cursor-progress',
        className
      )}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <LocateFixed className="h-4 w-4" />
      )}
    </button>
  );
};

export default LocateMeButton;
