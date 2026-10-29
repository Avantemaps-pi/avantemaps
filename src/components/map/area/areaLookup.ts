/**
 * Map areas for the tap drill-down: country → state → city → suburb, each a
 * Nominatim reverse lookup (polygon_geojson=1) at a fixed zoom.
 *
 * Checked before any network call, most → least specific:
 *   1. Polygon hit-test against cached areas of the level (border-accurate)
 *   2. Bbox hit-test against cached areas of the level
 *   3. Tile cache: level + rounded lat/lng → area key (or null = nothing there),
 *      in memory and in storage; precision rises with depth
 *   4. Area cache: level:osmKey → area, in memory and in storage
 *      (7-day TTL, stale-while-revalidate)
 *   5. In-flight de-dup per level + tile
 */

export type AreaLevel = 'country' | 'state' | 'city' | 'suburb';

export const AREA_LEVELS: AreaLevel[] = ['country', 'state', 'city', 'suburb'];

export interface Area {
  level: AreaLevel;
  /** osm_type + osm_id, e.g. "relation/87565" */
  osmKey: string;
  name: string;
  bbox: [number, number, number, number]; // south, north, west, east
  geojson: GeoJSON.Geometry | null;
  /** areaKey of the area one level up it was reached from (null for a country) */
  parentKey: string | null;
}

export const areaKey = (area: Pick<Area, 'level' | 'osmKey'>) => `${area.level}:${area.osmKey}`;

const ZOOM: Record<AreaLevel, number> = { country: 3, state: 5, city: 10, suburb: 14 };
// Tile size per level: 1 → ~11 km, 2 → ~1.1 km, 3 → ~110 m
const TILE_PRECISION: Record<AreaLevel, number> = { country: 1, state: 1, city: 2, suburb: 3 };
// Address fields to name an area by when the result has no name
const NAME_FIELDS: Record<AreaLevel, string[]> = {
  country: ['country'],
  state: ['state', 'province', 'region'],
  city: ['city', 'town', 'municipality', 'village', 'county'],
  suburb: ['suburb', 'neighbourhood', 'quarter', 'city_district', 'village'],
};

const STORAGE_PREFIX = 'area_focus_v2:';
const TILE_STORAGE_KEY = `${STORAGE_PREFIX}tiles`;
const TTL_MS = 7 * 24 * 60 * 60 * 1000;
const MEMORY_CAP = 120;
const TILE_MEMORY_CAP = 3000;
const TILE_STORAGE_CAP = 2000;

// ---------- LRU-ish caches (Map keeps insertion order) ----------

const memoryCache = new Map<string, Area>();
const tileCache = new Map<string, string | null>();
const inflight = new Map<string, Promise<Area | null | undefined>>();

const touch = <V,>(map: Map<string, V>, key: string, val: V, cap: number) => {
  if (map.has(key)) map.delete(key);
  map.set(key, val);
  while (map.size > cap) {
    const first = map.keys().next().value;
    if (first === undefined) break;
    map.delete(first);
  }
};

const tileKey = (level: AreaLevel, lat: number, lng: number) => {
  const p = TILE_PRECISION[level];
  return `${level}:${lat.toFixed(p)},${lng.toFixed(p)}`;
};

// ---------- Storage ----------

let tileStorageDirty = false;
const flushTileStorage = () => {
  if (!tileStorageDirty) return;
  tileStorageDirty = false;
  try {
    const entries = Array.from(tileCache.entries()).slice(-TILE_STORAGE_CAP);
    localStorage.setItem(TILE_STORAGE_KEY, JSON.stringify(entries));
  } catch {
    /* quota — ignore */
  }
};
const scheduleTileFlush = () => {
  tileStorageDirty = true;
  queueMicrotask(flushTileStorage);
};

const loadArea = (key: string): { area: Area; stale: boolean } | null => {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { ts: number; area: Area };
    return { area: parsed.area, stale: Date.now() - parsed.ts > TTL_MS };
  } catch {
    return null;
  }
};

const saveArea = (area: Area) => {
  try {
    localStorage.setItem(STORAGE_PREFIX + areaKey(area), JSON.stringify({ ts: Date.now(), area }));
  } catch {
    /* quota — ignore */
  }
};

let hydrated = false;
/** Loads the tile cache. Client only. */
export const hydrateAreaCache = () => {
  if (hydrated) return;
  hydrated = true;
  try {
    const raw = localStorage.getItem(TILE_STORAGE_KEY);
    if (raw) for (const [k, v] of JSON.parse(raw) as [string, string | null][]) tileCache.set(k, v);
  } catch {
    /* ignore */
  }
};

/** A cached area by key (memory, then storage) */
export const getCachedArea = (key: string | null): Area | null => {
  if (!key) return null;
  const inMemory = memoryCache.get(key);
  if (inMemory) return inMemory;
  const stored = loadArea(key);
  if (!stored) return null;
  touch(memoryCache, key, stored.area, MEMORY_CAP);
  return stored.area;
};

// ---------- Geo helpers ----------

const inBbox = (lat: number, lng: number, b: Area['bbox']) =>
  lat >= b[0] && lat <= b[1] && lng >= b[2] && lng <= b[3];

// Ray-casting point-in-polygon (lng, lat)
const pointInRing = (lng: number, lat: number, ring: GeoJSON.Position[]) => {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi = 0, yi = 0] = ring[i] ?? [];
    const [xj = 0, yj = 0] = ring[j] ?? [];
    const intersect = yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi + 1e-12) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
};

const pointInPolygon = (lat: number, lng: number, rings: GeoJSON.Position[][]) => {
  const [outer, ...holes] = rings;
  if (!outer || !pointInRing(lng, lat, outer)) return false;
  return !holes.some((hole) => pointInRing(lng, lat, hole));
};

const pointInGeometry = (lat: number, lng: number, geo: GeoJSON.Geometry): boolean => {
  if (geo.type === 'Polygon') return pointInPolygon(lat, lng, geo.coordinates);
  if (geo.type === 'MultiPolygon') return geo.coordinates.some((p) => pointInPolygon(lat, lng, p));
  return false;
};

/** Whether the point is inside the area: its polygon when it has one, else its bbox */
export const areaContains = (area: Area, lat: number, lng: number) =>
  inBbox(lat, lng, area.bbox) && (!area.geojson || pointInGeometry(lat, lng, area.geojson));

const findCachedArea = (level: AreaLevel, lat: number, lng: number): Area | null => {
  const areas = Array.from(memoryCache.values()).reverse().filter((a) => a.level === level);
  return (
    areas.find((a) => a.geojson && inBbox(lat, lng, a.bbox) && pointInGeometry(lat, lng, a.geojson)) ??
    areas.find((a) => !a.geojson && inBbox(lat, lng, a.bbox)) ??
    null
  );
};

// ---------- Network ----------

interface NominatimReverse {
  osm_type?: string;
  osm_id?: number;
  name?: string;
  address?: Record<string, string>;
  boundingbox?: [string, string, string, string];
  geojson?: GeoJSON.Geometry;
}

/** undefined: the request was dropped for a newer one */
const fetchAreaNetwork = async (
  level: AreaLevel,
  lat: number,
  lng: number,
  parentKey: string | null
): Promise<Area | null | undefined> => {
  const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=${ZOOM[level]}&addressdetails=1&polygon_geojson=1`;
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error('reverse geocode failed');
  const json = (await res.json()) as NominatimReverse;
  const name = json.name || NAME_FIELDS[level].map((f) => json.address?.[f]).find(Boolean);
  if (!json.osm_type || json.osm_id == null || !json.boundingbox || !name) return null;
  const [south, north, west, east] = json.boundingbox.map(parseFloat) as [number, number, number, number];
  return {
    level,
    osmKey: `${json.osm_type}/${json.osm_id}`,
    name,
    bbox: [south, north, west, east],
    geojson: json.geojson ?? null,
    parentKey,
  };
};

const commit = (area: Area) => {
  touch(memoryCache, areaKey(area), area, MEMORY_CAP);
  saveArea(area);
};

/**
 * The area of this level under the point. null: nothing there; undefined: the
 * lookup was dropped because a newer tap's lookup replaced it.
 */
export const lookupArea = async (
  level: AreaLevel,
  lat: number,
  lng: number,
  parentKey: string | null
): Promise<Area | null | undefined> => {
  const cachedHit = findCachedArea(level, lat, lng);
  if (cachedHit) {
    touch(memoryCache, areaKey(cachedHit), cachedHit, MEMORY_CAP);
    return cachedHit;
  }

  const tile = tileKey(level, lat, lng);
  if (tileCache.has(tile)) {
    const key = tileCache.get(tile) ?? null;
    touch(tileCache, tile, key, TILE_MEMORY_CAP);
    if (!key) return null;
    const inMemory = memoryCache.get(key);
    if (inMemory) return inMemory;
    const stored = loadArea(key);
    if (stored) {
      touch(memoryCache, key, stored.area, MEMORY_CAP);
      if (stored.stale) {
        // Stale-while-revalidate: answer now, refresh in the background
        fetchAreaNetwork(level, lat, lng, stored.area.parentKey)
          .then((fresh) => fresh && commit(fresh))
          .catch(() => {});
      }
      return stored.area;
    }
  }

  const existing = inflight.get(tile);
  if (existing) return existing;

  const promise = (async () => {
    const area = await fetchAreaNetwork(level, lat, lng, parentKey);
    if (area === undefined) return undefined;
    // The tile remembers what's there, even when it's an area from another level
    // (the same OSM object as the parent), so the skip needs no request next time
    touch(tileCache, tile, area ? areaKey(area) : null, TILE_MEMORY_CAP);
    scheduleTileFlush();
    if (area) commit(area);
    return area;
  })();

  inflight.set(tile, promise);
  try {
    return await promise;
  } finally {
    inflight.delete(tile);
  }
};

// ---------- Tap rules ----------

export type TapResult =
  | { kind: 'select'; area: Area }
  | { kind: 'clear' }
  | { kind: 'none' }
  /** A newer tap replaced this one */
  | { kind: 'dropped' };

const ancestorsOf = (area: Area | null): Area[] => {
  const chain: Area[] = [];
  const seen = new Set<string>();
  for (let a = area; a && !seen.has(areaKey(a)); a = getCachedArea(a.parentKey)) {
    seen.add(areaKey(a));
    chain.push(a);
  }
  return chain;
};

/**
 * The first area from `level` down whose OSM object isn't one already in the
 * chain (no separate province: skip to the next level). null: nothing there.
 */
const pickFrom = async (
  level: AreaLevel,
  lat: number,
  lng: number,
  parent: Area | null,
  chain: Area[]
): Promise<Area | null | undefined> => {
  const taken = new Set(chain.map((a) => a.osmKey));
  for (let i = AREA_LEVELS.indexOf(level); i < AREA_LEVELS.length; i++) {
    const found = await lookupArea(AREA_LEVELS[i]!, lat, lng, parent ? areaKey(parent) : null);
    if (found === undefined || found === null) return found;
    if (!taken.has(found.osmKey)) return found;
  }
  return null;
};

const nextLevel = (level: AreaLevel): AreaLevel | null => AREA_LEVELS[AREA_LEVELS.indexOf(level) + 1] ?? null;

/**
 * What a tap at this point selects, given the highlighted area:
 * - nothing highlighted: the country
 * - inside the highlighted area: one level deeper (nothing at suburb level)
 * - outside it: the area under the tap one level below the nearest ancestor that
 *   contains the tap (the same level when the parent does); outside every
 *   ancestor, a new country
 * Ocean or no country result clears the highlight.
 */
export const resolveTap = async (current: Area | null, lat: number, lng: number): Promise<TapResult> => {
  const chain = ancestorsOf(current);
  const done = (area: Area | null | undefined, ifNone: TapResult): TapResult =>
    area === undefined ? { kind: 'dropped' } : area ? { kind: 'select', area } : ifNone;

  if (current && areaContains(current, lat, lng)) {
    const deeper = nextLevel(current.level);
    if (!deeper) return { kind: 'none' };
    return done(await pickFrom(deeper, lat, lng, current, chain), { kind: 'none' });
  }

  const container = chain.slice(1).find((a) => areaContains(a, lat, lng));
  if (container) {
    const level = nextLevel(container.level)!;
    const area = await pickFrom(level, lat, lng, container, chain.slice(chain.indexOf(container)));
    // The lookup can disagree with our hit-test right on a border
    if (area && current && areaKey(area) === areaKey(current)) return { kind: 'none' };
    return done(area, { kind: 'none' });
  }

  return done(await pickFrom('country', lat, lng, null, []), { kind: 'clear' });
};
