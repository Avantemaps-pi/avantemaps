import { useRef } from 'react';
import { useMapEvents } from 'react-leaflet';
import L from 'leaflet';

/**
 * On map click, reverse-geocode the point, fly to that country's bounds,
 * and highlight its polygon outline/fill.
 *
 * Caching strategy (to minimize Nominatim calls):
 *  - L1: in-memory cache by country_code -> { bbox, geojson }
 *  - L2: localStorage cache by country_code (7-day TTL) for bbox + geojson
 *  - Tile cache: rounded lat/lng -> country_code, so repeated clicks within
 *    the same ~0.5° tile resolve instantly without any network call
 *  - In-flight de-duplication so simultaneous clicks share one request
 */

interface CountryData {
  bbox: [number, number, number, number]; // south, north, west, east
  geojson: any | null;
}

const STORAGE_PREFIX = 'country_focus_v1:';
const TTL_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Tile precision (decimal places used to round lat/lng for the tile cache key).
 * Higher = more accurate but lower cache hit rate; lower = coarser but more reuse.
 *
 *   0  → ~111 km tiles  (very high reuse, may misclassify near borders)
 *   1  → ~11 km tiles   (default — good balance)
 *   2  → ~1.1 km tiles  (high accuracy, lower reuse)
 *   3  → ~110 m tiles   (near-exact, minimal reuse)
 *
 * Override at runtime: `window.__COUNTRY_FOCUS_TILE_PRECISION = 2`
 */
export const DEFAULT_TILE_PRECISION = 1;

const getTilePrecision = (): number => {
  const override = (globalThis as any).__COUNTRY_FOCUS_TILE_PRECISION;
  return Number.isFinite(override) ? Math.max(0, Math.min(4, override)) : DEFAULT_TILE_PRECISION;
};

const memoryCache = new Map<string, CountryData>();
const tileCache = new Map<string, string | null>(); // tileKey -> country_code or null (ocean)
const inflight = new Map<string, Promise<{ countryCode: string | null; data: CountryData | null }>>();

const tileKey = (lat: number, lng: number) => {
  const p = getTilePrecision();
  return `${lat.toFixed(p)},${lng.toFixed(p)}`;
};

const loadFromStorage = (code: string): CountryData | null => {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + code);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { ts: number; data: CountryData };
    if (Date.now() - parsed.ts > TTL_MS) {
      localStorage.removeItem(STORAGE_PREFIX + code);
      return null;
    }
    return parsed.data;
  } catch {
    return null;
  }
};

const saveToStorage = (code: string, data: CountryData) => {
  try {
    localStorage.setItem(
      STORAGE_PREFIX + code,
      JSON.stringify({ ts: Date.now(), data })
    );
  } catch {
    // quota exceeded — ignore
  }
};

const fetchCountry = async (
  lat: number,
  lng: number
): Promise<{ countryCode: string | null; data: CountryData | null }> => {
  const key = tileKey(lat, lng);

  // Tile cache hit (covers ocean too, where value is null)
  if (tileCache.has(key)) {
    const code = tileCache.get(key) ?? null;
    if (!code) return { countryCode: null, data: null };
    const cached = memoryCache.get(code) ?? loadFromStorage(code);
    if (cached) {
      memoryCache.set(code, cached);
      return { countryCode: code, data: cached };
    }
  }

  // De-dupe in-flight requests for the same tile
  const existing = inflight.get(key);
  if (existing) return existing;

  const promise = (async () => {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=3&addressdetails=1&polygon_geojson=1`;
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!res.ok) throw new Error('reverse geocode failed');
    const json = await res.json();
    const countryCode: string | undefined = json?.address?.country_code;
    const bboxRaw: [string, string, string, string] | undefined = json?.boundingbox;

    if (!countryCode || !bboxRaw) {
      tileCache.set(key, null);
      return { countryCode: null, data: null };
    }

    const data: CountryData = {
      bbox: [
        parseFloat(bboxRaw[0]),
        parseFloat(bboxRaw[1]),
        parseFloat(bboxRaw[2]),
        parseFloat(bboxRaw[3]),
      ],
      geojson: json.geojson ?? null,
    };

    memoryCache.set(countryCode, data);
    saveToStorage(countryCode, data);
    tileCache.set(key, countryCode);
    return { countryCode, data };
  })();

  inflight.set(key, promise);
  try {
    return await promise;
  } finally {
    inflight.delete(key);
  }
};

const CountryClickFocus: React.FC = () => {
  const lastClickRef = useRef<number>(0);
  const lastCountryRef = useRef<string | null>(null);
  const layerRef = useRef<L.GeoJSON | null>(null);

  const map = useMapEvents({
    click: async (e) => {
      const target = e.originalEvent?.target as HTMLElement | null;
      if (
        target?.closest(
          '.leaflet-marker-icon, .leaflet-popup, .leaflet-control, .leaflet-interactive'
        )
      ) {
        return;
      }

      const now = Date.now();
      if (now - lastClickRef.current < 350) return;
      lastClickRef.current = now;

      try {
        const { lat, lng } = e.latlng;
        const { countryCode, data } = await fetchCountry(lat, lng);

        // Ocean / no country — clear highlight
        if (!countryCode || !data) {
          if (layerRef.current) {
            layerRef.current.remove();
            layerRef.current = null;
          }
          lastCountryRef.current = null;
          return;
        }

        if (lastCountryRef.current === countryCode) return;
        lastCountryRef.current = countryCode;

        if (layerRef.current) {
          layerRef.current.remove();
          layerRef.current = null;
        }

        if (data.geojson) {
          const primary =
            getComputedStyle(document.documentElement)
              .getPropertyValue('--primary')
              .trim() || '221 83% 53%';
          const color = `hsl(${primary})`;

          layerRef.current = L.geoJSON(data.geojson, {
            style: {
              color,
              weight: 2,
              opacity: 0.9,
              fillColor: color,
              fillOpacity: 0.12,
              interactive: false,
            },
          }).addTo(map);
        }

        const [south, north, west, east] = data.bbox;
        const bounds = L.latLngBounds([south, west], [north, east]);
        map.flyToBounds(bounds, { padding: [40, 40], duration: 0.8 });
      } catch {
        // silent fail
      }
    },
  });

  return null;
};

export default CountryClickFocus;
