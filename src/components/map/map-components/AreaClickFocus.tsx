import { useEffect, useLayoutEffect, useRef } from 'react';
import { useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { type Area, hydrateAreaCache, resolveTap } from '../area/areaLookup';

export interface AreaSelection {
  area: Area;
  /** Fly to its bounds (a tap or "Up"); false just draws it */
  fly: boolean;
}

interface AreaClickFocusProps {
  /** The highlighted area, owned by the page (it shows the area label) */
  selection: AreaSelection | null;
  /** A tap picked an area (null: clear, e.g. the ocean) */
  onSelect: (selection: AreaSelection | null) => void;
  /** Read at click time: when true (the card strip is open) a tap only closes the strip */
  skipRef?: React.RefObject<boolean> | undefined;
}

/**
 * Tap the map to drill down: country → state → city → suburb (see resolveTap).
 * Draws the selected area's outline in the primary colour and flies to it.
 */
const AreaClickFocus: React.FC<AreaClickFocusProps> = ({ selection, onSelect, skipRef }) => {
  const lastClickRef = useRef<number>(0);
  const layerRef = useRef<L.GeoJSON | null>(null);
  const mountedRef = useRef(true);
  // Only the newest tap's result is applied
  const tapSeqRef = useRef(0);
  const current = useRef<Area | null>(selection?.area ?? null);
  current.current = selection?.area ?? null;
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  // Client-only cache hydration; in an effect so no storage access happens during render
  useEffect(() => {
    hydrateAreaCache();
  }, []);

  const map = useMapEvents({
    click: async (e) => {
      if (skipRef?.current) return;
      const target = e.originalEvent?.target as HTMLElement | null;
      if (target?.closest('.leaflet-marker-icon, .leaflet-popup, .leaflet-control, .leaflet-interactive')) {
        return;
      }

      const now = Date.now();
      if (now - lastClickRef.current < 350) return;
      lastClickRef.current = now;

      const seq = ++tapSeqRef.current;
      try {
        const { lat, lng } = e.latlng;
        const result = await resolveTap(current.current, lat, lng);
        // The map may have unmounted, or a newer tap taken over, while the lookup ran
        if (!mountedRef.current || seq !== tapSeqRef.current) return;
        if (result.kind === 'select') onSelectRef.current({ area: result.area, fly: true });
        else if (result.kind === 'clear') onSelectRef.current(null);
      } catch {
        /* silent */
      }
    },
  });

  // Draw the selected area (replacing the previous outline) and fly to it if asked
  useEffect(() => {
    layerRef.current?.remove();
    layerRef.current = null;
    if (!selection) return;
    const { area, fly } = selection;
    if (area.geojson) {
      const primary = getComputedStyle(document.documentElement).getPropertyValue('--primary').trim() || '221 83% 53%';
      const color = `hsl(${primary})`;
      layerRef.current = L.geoJSON(area.geojson, {
        style: { color, weight: 2, opacity: 0.9, fillColor: color, fillOpacity: 0.12, interactive: false },
      }).addTo(map);
    }
    if (fly) {
      const [south, north, west, east] = area.bbox;
      const bounds = L.latLngBounds([south, west], [north, east]);
      const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
      if (reduceMotion) map.fitBounds(bounds, { padding: [40, 40], animate: false });
      else map.flyToBounds(bounds, { padding: [40, 40], duration: 0.8 });
    }
  }, [map, selection]);

  // On unmount: stop flyToBounds and remove the highlight layer, so no animation step or
  // layer runs against a removed map. A layout-effect cleanup runs before MapContainer's
  // map.remove(), so the map is still alive here (MapViewUpdater also ends zoom animations).
  useLayoutEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      map.stop();
      layerRef.current?.remove();
      layerRef.current = null;
    };
  }, [map]);

  return null;
};

export default AreaClickFocus;
