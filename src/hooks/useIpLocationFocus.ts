import { useEffect } from 'react';
import {
  canAutoCentreWithGps,
  GPS_AUTOCENTRE_FAILED_KEY,
  GPS_AUTOCENTRE_FAILED_EVENT,
} from '@/lib/gpsGrant';

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
 * - Skipped when LeafletMap will centre on GPS (already allowed), so the map
 *   doesn't jump from city to street; used once if that GPS attempt fails
 */
export function useIpLocationFocus(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    if (localStorage.getItem('use_location_focus') === '0') return;
    if (sessionStorage.getItem(SESSION_KEY) === '1') return;

    let cancelled = false;

    const dispatch = (lat: number, lng: number) => {
      sessionStorage.setItem(SESSION_KEY, '1');
      // Slight delay to let map mount
      setTimeout(() => {
        window.dispatchEvent(
          new CustomEvent('centerMap', { detail: { lat, lng, zoom: 14 } })
        );
      }, 400);
    };

    const focusOnIp = async () => {
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
    };

    const onGpsFailed = () => {
      window.removeEventListener(GPS_AUTOCENTRE_FAILED_EVENT, onGpsFailed);
      if (!cancelled) focusOnIp();
    };

    (async () => {
      if (await canAutoCentreWithGps()) {
        if (cancelled) return;
        // GPS centres the map; fall back to IP once if it fails (it may already have)
        sessionStorage.setItem(SESSION_KEY, '1');
        if (sessionStorage.getItem(GPS_AUTOCENTRE_FAILED_KEY) === '1') focusOnIp();
        else window.addEventListener(GPS_AUTOCENTRE_FAILED_EVENT, onGpsFailed);
        return;
      }
      if (!cancelled) focusOnIp();
    })();

    return () => {
      cancelled = true;
      window.removeEventListener(GPS_AUTOCENTRE_FAILED_EVENT, onGpsFailed);
    };
  }, [enabled]);
}
