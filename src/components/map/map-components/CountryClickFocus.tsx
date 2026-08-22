import { useEffect, useRef } from 'react';
import { useMapEvents } from 'react-leaflet';
import L from 'leaflet';

/**
 * On map click, reverse-geocode the point, fly to that country's bounds,
 * and highlight its polygon outline/fill.
 *
 * Multi-tier cache (most → least specific, all checked before any network call):
 *
 *   1. Polygon hit-test       — if point lies inside an already-cached country's
 *                               GeoJSON, resolve instantly (border-accurate).
 *   2. Bbox hit-test          — fast bounding-box check across cached countries.
 *                               Catches clicks anywhere in a previously-loaded
 *                               country with zero network cost.
 *   3. Tile cache (in-mem)    — rounded lat/lng → country_code (or null=ocean).
 *   4. Tile cache (storage)   — same, persisted across reloads.
 *   5. Country cache (memory) — country_code → { bbox, geojson }.
 *   6. Country cache (storage)— same, 7-day TTL, stale-while-revalidate.
 *   7. In-flight de-dup       — concurrent clicks on the same tile share one fetch.
 */

interface CountryData {
  bbox: [number, number, number, number]; // south, north, west, east
  geojson: any | null;
}

const STORAGE_PREFIX = 'country_focus_v1:';
const TILE_STORAGE_KEY = 'country_focus_v1_tiles';
const TTL_MS = 7 * 24 * 60 * 60 * 1000;
const MEMORY_CAP = 60;       // max cached countries in memory
const TILE_MEMORY_CAP = 2000; // max tile entries in memory
const TILE_STORAGE_CAP = 1500;

/**
 * Tile precision (decimals on lat/lng). Higher = accurate, lower hit-rate.
 *   0 → ~111 km   1 → ~11 km (default)   2 → ~1.1 km   3 → ~110 m
 * Override at runtime: `window.__COUNTRY_FOCUS_TILE_PRECISION = 2`
 */
export const DEFAULT_TILE_PRECISION = 1;

const getTilePrecision = (): number => {
  const o = (globalThis as any).__COUNTRY_FOCUS_TILE_PRECISION;
  return Number.isFinite(o) ? Math.max(0, Math.min(4, o)) : DEFAULT_TILE_PRECISION;
};

// ---------- LRU-ish caches (Map preserves insertion order) ----------

const memoryCache = new Map<string, CountryData>();
const tileCache = new Map<string, string | null>();
const inflight = new Map<string, Promise<{ countryCode: string | null; data: CountryData | null }>>();

const touch = <V,>(map: Map<string, V>, key: string, val: V, cap: number) => {
  if (map.has(key)) map.delete(key);
  map.set(key, val);
  while (map.size > cap) {
    const first = map.keys().next().value;
    if (first === undefined) break;
    map.delete(first);
  }
};

const tileKey = (lat: number, lng: number) => {
  const p = getTilePrecision();
  return `${lat.toFixed(p)},${lng.toFixed(p)}`;
};

// ---------- Persistent tile cache ----------

let tileStorageDirty = false;
const flushTileStorage = () => {
  if (!tileStorageDirty) return;
  tileStorageDirty = false;
  try {
    // Only persist most-recent TILE_STORAGE_CAP entries
    const entries = Array.from(tileCache.entries()).slice(-TILE_STORAGE_CAP);
    localStorage.setItem(TILE_STORAGE_KEY, JSON.stringify(entries));
  } catch {
    /* quota — ignore */
  }
};
const scheduleTileFlush = () => {
  tileStorageDirty = true;
  // Coalesce writes
  if (typeof queueMicrotask === 'function') queueMicrotask(flushTileStorage);
  else setTimeout(flushTileStorage, 0);
};

const hydrateTileCache = () => {
  try {
    const raw = localStorage.getItem(TILE_STORAGE_KEY);
    if (!raw) return;
    const entries = JSON.parse(raw) as [string, string | null][];
    for (const [k, v] of entries) tileCache.set(k, v);
  } catch {
    /* ignore */
  }
};

// ---------- Persistent country cache (with stale-while-revalidate) ----------

const loadFromStorage = (
  code: string
): { data: CountryData; stale: boolean } | null => {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + code);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { ts: number; data: CountryData };
    return { data: parsed.data, stale: Date.now() - parsed.ts > TTL_MS };
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
    /* quota — ignore */
  }
};

// ---------- Geo helpers ----------

const inBbox = (lat: number, lng: number, b: CountryData['bbox']) =>
  lat >= b[0] && lat <= b[1] && lng >= b[2] && lng <= b[3];

// Ray-casting point-in-polygon (lng, lat)
const pointInRing = (lng: number, lat: number, ring: number[][]) => {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const ri = ring[i];
    const rj = ring[j];
    if (!ri || !rj) continue;
    const [xi, yi] = ri;
    const [xj, yj] = rj;
    const intersect =
      yi > lat !== yj > lat &&
      lng < ((xj - xi) * (lat - yi)) / (yj - yi + 1e-12) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
};

const pointInGeoJson = (lat: number, lng: number, geo: any): boolean => {
  if (!geo) return false;
  const test = (coords: number[][][]) => {
    if (!coords?.length) return false;
    const outer = coords[0];
    if (!outer || !pointInRing(lng, lat, outer)) return false;
    for (let i = 1; i < coords.length; i++) {
      const hole = coords[i];
      if (hole && pointInRing(lng, lat, hole)) return false; // hole
    }
    return true;
  };
  if (geo.type === 'Polygon') return test(geo.coordinates);
  if (geo.type === 'MultiPolygon') return geo.coordinates.some(test);
  return false;
};

/** Search cached countries; returns the one containing this point, if any. */
const findCachedCountry = (
  lat: number,
  lng: number
): { countryCode: string; data: CountryData } | null => {
  // Iterate in reverse (most-recently-used first)
  const entries = Array.from(memoryCache.entries()).reverse();
  // Polygon-accurate pass first
  for (const [code, data] of entries) {
    if (data.geojson && inBbox(lat, lng, data.bbox) &&
        pointInGeoJson(lat, lng, data.geojson)) {
      return { countryCode: code, data };
    }
  }
  // Fallback: bbox-only (cheaper but can overlap between countries)
  for (const [code, data] of entries) {
    if (!data.geojson && inBbox(lat, lng, data.bbox)) {
      return { countryCode: code, data };
    }
  }
  return null;
};

// ---------- Network ----------

const fetchCountryNetwork = async (
  lat: number,
  lng: number
): Promise<{ countryCode: string | null; data: CountryData | null }> => {
  const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=3&addressdetails=1&polygon_geojson=1`;
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error('reverse geocode failed');
  const json = await res.json();
  const code: string | undefined = json?.address?.country_code;
  const bboxRaw: [string, string, string, string] | undefined = json?.boundingbox;
  if (!code || !bboxRaw) return { countryCode: null, data: null };
  const data: CountryData = {
    bbox: [
      parseFloat(bboxRaw[0]),
      parseFloat(bboxRaw[1]),
      parseFloat(bboxRaw[2]),
      parseFloat(bboxRaw[3]),
    ],
    geojson: json.geojson ?? null,
  };
  return { countryCode: code, data };
};

const commit = (code: string, data: CountryData) => {
  touch(memoryCache, code, data, MEMORY_CAP);
  saveToStorage(code, data);
};

const fetchCountry = async (
  lat: number,
  lng: number
): Promise<{ countryCode: string | null; data: CountryData | null }> => {
  // 1 + 2: hit-test against already-cached country polygons / bboxes
  const cachedHit = findCachedCountry(lat, lng);
  if (cachedHit) {
    touch(memoryCache, cachedHit.countryCode, cachedHit.data, MEMORY_CAP);
    return cachedHit;
  }

  // 3 + 4: tile cache
  const key = tileKey(lat, lng);
  if (tileCache.has(key)) {
    const code = tileCache.get(key) ?? null;
    touch(tileCache, key, code, TILE_MEMORY_CAP); // refresh LRU position
    if (!code) return { countryCode: null, data: null };
    let cached = memoryCache.get(code);
    if (!cached) {
      const persisted = loadFromStorage(code);
      if (persisted) {
        cached = persisted.data;
        touch(memoryCache, code, cached, MEMORY_CAP);
        if (persisted.stale) {
          // SWR: refresh in background, return cached immediately
          fetchCountryNetwork(lat, lng)
            .then(({ countryCode, data }) => {
              if (countryCode && data) commit(countryCode, data);
            })
            .catch(() => {});
        }
      }
    }
    if (cached) return { countryCode: code, data: cached };
  }

  // 7: dedupe simultaneous fetches
  const existing = inflight.get(key);
  if (existing) return existing;

  const promise = (async () => {
    const { countryCode, data } = await fetchCountryNetwork(lat, lng);
    if (!countryCode || !data) {
      touch(tileCache, key, null, TILE_MEMORY_CAP);
      scheduleTileFlush();
      return { countryCode: null, data: null };
    }
    commit(countryCode, data);
    touch(tileCache, key, countryCode, TILE_MEMORY_CAP);
    scheduleTileFlush();
    return { countryCode, data };
  })();

  inflight.set(key, promise);
  try {
    return await promise;
  } finally {
    inflight.delete(key);
  }
};

// One-time hydration
let hydrated = false;
const hydrateOnce = () => {
  if (hydrated) return;
  hydrated = true;
  hydrateTileCache();
};

const CountryClickFocus: React.FC = () => {
  const lastClickRef = useRef<number>(0);
  const lastCountryRef = useRef<string | null>(null);
  const layerRef = useRef<L.GeoJSON | null>(null);

  // Client-only cache hydration; runs in an effect (not the render body) so
  // no localStorage access happens during render.
  useEffect(() => {
    hydrateOnce();
  }, []);

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
        /* silent */
      }
    },
  });

  return null;
};

export default CountryClickFocus;
