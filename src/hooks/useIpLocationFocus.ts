import { useEffect } from 'react';

const CACHE_KEY = 'ip_location_cache_v1';
const SESSION_KEY = 'ip_location_focused';
const TTL_MS = 24 * 60 * 60 * 1000; // 24h

interface CachedLocation {
  lat: number;
  lng: number;
  ts: number;
}

/**
 * Lightweight, IP-based map focus on login.
 * - Cached for 24h in localStorage (no refetch on each login)
 * - Fires once per browser session (sessionStorage flag)
 * - Uses HTTPS endpoint, no API key
 */
export function useIpLocationFocus(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    if (sessionStorage.getItem(SESSION_KEY) === '1') return;

    const dispatch = (lat: number, lng: number) => {
      sessionStorage.setItem(SESSION_KEY, '1');
      // Slight delay to let map mount
      setTimeout(() => {
        window.dispatchEvent(
          new CustomEvent('centerMap', { detail: { lat, lng, zoom: 11 } })
        );
      }, 400);
    };

    // Try cached value first
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (raw) {
        const cached: CachedLocation = JSON.parse(raw);
        if (Date.now() - cached.ts < TTL_MS) {
          dispatch(cached.lat, cached.lng);
          return;
        }
      }
    } catch {
      // ignore
    }

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('https://ipwho.is/?fields=success,latitude,longitude');
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;
        if (data?.success && typeof data.latitude === 'number' && typeof data.longitude === 'number') {
          localStorage.setItem(
            CACHE_KEY,
            JSON.stringify({ lat: data.latitude, lng: data.longitude, ts: Date.now() })
          );
          dispatch(data.latitude, data.longitude);
        }
      } catch {
        // silent fail — non-blocking
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [enabled]);
}
