import { useRef } from 'react';
import { useMapEvents } from 'react-leaflet';
import L from 'leaflet';

/**
 * On map click, reverse-geocode the point and fit map to that country's bounds.
 * Ignores clicks on markers/popups/controls and double-clicks.
 */
const CountryClickFocus: React.FC = () => {
  const lastClickRef = useRef<number>(0);
  const lastCountryRef = useRef<string | null>(null);

  const map = useMapEvents({
    click: async (e) => {
      // Ignore clicks originating from markers, popups, or controls
      const target = e.originalEvent?.target as HTMLElement | null;
      if (
        target?.closest(
          '.leaflet-marker-icon, .leaflet-popup, .leaflet-control, .leaflet-interactive'
        )
      ) {
        return;
      }

      const now = Date.now();
      if (now - lastClickRef.current < 350) return; // debounce / avoid dblclick
      lastClickRef.current = now;

      try {
        const { lat, lng } = e.latlng;
        const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=3&addressdetails=1`;
        const res = await fetch(url, {
          headers: { Accept: 'application/json' },
        });
        if (!res.ok) return;
        const data = await res.json();
        const countryCode: string | undefined = data?.address?.country_code;
        const bbox: [string, string, string, string] | undefined = data?.boundingbox;
        if (!countryCode || !bbox) return;

        // Avoid re-zooming if user clicks within the same country again
        if (lastCountryRef.current === countryCode) return;
        lastCountryRef.current = countryCode;

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
