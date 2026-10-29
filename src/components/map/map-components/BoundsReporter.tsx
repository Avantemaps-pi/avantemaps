import { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';

interface BoundsReporterProps {
  onBoundsChange?: ((bounds: L.LatLngBounds) => void) | undefined;
}

// Settles a burst of moves (fly animations, inertia) into one report
const DEBOUNCE_MS = 150;

/**
 * Reports the map's bounds once it's ready and after every move, user or code
 * (debounced), so the page always knows what's in view.
 */
const BoundsReporter: React.FC<BoundsReporterProps> = ({ onBoundsChange }) => {
  const map = useMap();
  const callback = useRef(onBoundsChange);
  callback.current = onBoundsChange;

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const report = () => {
      clearTimeout(timer);
      timer = setTimeout(() => callback.current?.(map.getBounds()), DEBOUNCE_MS);
    };
    map.whenReady(report);
    map.on('moveend', report);
    return () => {
      clearTimeout(timer);
      map.off('moveend', report);
    };
  }, [map]);

  return null;
};

export default BoundsReporter;
