import { useRef } from 'react';
import { useMapEvents } from 'react-leaflet';
import L from 'leaflet';

/**
 * On map click, reverse-geocode the point, fly to that country's bounds,
 * and highlight its polygon outline/fill on the map.
 */
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
        const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=3&addressdetails=1&polygon_geojson=1`;
        const res = await fetch(url, { headers: { Accept: 'application/json' } });
        if (!res.ok) return;
        const data = await res.json();
        const countryCode: string | undefined = data?.address?.country_code;
        const bbox: [string, string, string, string] | undefined = data?.boundingbox;

        // Clicked on ocean / no country — clear any highlight
        if (!countryCode) {
          if (layerRef.current) {
            layerRef.current.remove();
            layerRef.current = null;
          }
          lastCountryRef.current = null;
          return;
        }
        if (!bbox) return;

        if (lastCountryRef.current === countryCode) return;
        lastCountryRef.current = countryCode;

        // Remove previous highlight
        if (layerRef.current) {
          layerRef.current.remove();
          layerRef.current = null;
        }

        // Add polygon highlight if available
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

        const south = parseFloat(bbox[0]);
        const north = parseFloat(bbox[1]);
        const west = parseFloat(bbox[2]);
        const east = parseFloat(bbox[3]);
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
