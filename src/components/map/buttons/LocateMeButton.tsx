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

const dispatchCenter = (lat: number, lng: number, zoom = 14) => {
  window.dispatchEvent(new CustomEvent('centerMap', { detail: { lat, lng, zoom } }));
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

const LocateMeButton: React.FC<{ className?: string }> = ({ className }) => {
  const [loading, setLoading] = useState(false);

  const useIpFallback = async () => {
    toast.loading('Resolving your approximate location…', {
      id: TOAST_ID,
      description: 'Using IP-based location.',
    });
    const res = await fetchIpLocation();
    if (res) {
      localStorage.setItem(CACHE_KEY, JSON.stringify({ ...res, ts: Date.now() }));
      dispatchCenter(res.lat, res.lng, 12);
      toast.success('Centered on your approximate location', { id: TOAST_ID });
    } else {
      toast.error("Couldn't determine your location", {
        id: TOAST_ID,
        description: 'Network or service error. Check your connection and try again.',
      });
    }
  };

  const usePreciseLocation = () =>
    new Promise<boolean>((resolve) => {
      if (!('geolocation' in navigator)) {
        resolve(false);
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          dispatchCenter(latitude, longitude, 15);
          toast.success('Centered on your location', { id: TOAST_ID });
          resolve(true);
        },
        (err) => {
          if (err.code === err.PERMISSION_DENIED) {
            toast.message('Location permission denied', {
              id: TOAST_ID,
              description: 'Falling back to approximate IP-based location.',
            });
          }
          resolve(false);
        },
        { enableHighAccuracy: false, timeout: 10000, maximumAge: 60_000 }
      );
    });

  const handleClick = async () => {
    if (loading) return;
    setLoading(true);

    try {
      // Check permission state first
      let permissionState: PermissionState | 'unknown' = 'unknown';
      try {
        if (navigator.permissions?.query) {
          const status = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
          permissionState = status.state;
        }
      } catch {
        // some browsers throw — ignore
      }

      if (permissionState !== 'denied' && 'geolocation' in navigator) {
        toast.loading(
          permissionState === 'granted' ? 'Getting your location…' : 'Requesting location permission…',
          { id: TOAST_ID, description: permissionState === 'prompt' ? 'Please allow location access in the prompt.' : undefined }
        );
        const ok = await usePreciseLocation();
        if (ok) return;
      }

      // Fallback: cached IP location
      try {
        const raw = localStorage.getItem(CACHE_KEY);
        if (raw) {
          const cached: CachedLocation = JSON.parse(raw);
          if (Date.now() - cached.ts < TTL_MS) {
            dispatchCenter(cached.lat, cached.lng, 12);
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

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      aria-label={loading ? 'Resolving your location' : 'Locate me'}
      aria-busy={loading}
      title={loading ? 'Resolving your location…' : 'Locate me'}
      className={cn(
        'h-10 w-10 rounded-full bg-background/95 backdrop-blur-sm border border-border shadow-md flex items-center justify-center text-foreground hover:bg-accent transition-colors disabled:opacity-70 disabled:cursor-progress',
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
