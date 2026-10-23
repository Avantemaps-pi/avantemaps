
import { useEffect, useLayoutEffect } from 'react';
import { useMap } from 'react-leaflet';
import type { LatLngTuple, Map as LeafletMap } from 'leaflet';

interface MapViewUpdaterProps {
  center: LatLngTuple;
  zoom: number;
}

const MapViewUpdater: React.FC<MapViewUpdaterProps> = ({ center, zoom }) => {
  const map = useMap();

  // Update the map view when a new center/zoom is requested. LeafletMap creates a new
  // center tuple for every request (even to the same spot, e.g. Locate me twice), so the
  // tuple identity is the trigger; unrelated re-renders reuse it and don't move the map.
  useEffect(() => {
    // Cancel any pan/zoom/fly still running so animations don't overlap.
    map.stop();
    map.setView(center, zoom);
  }, [map, center, zoom]);

  // Stop animations before the map unmounts (e.g. navigating away mid-zoom). Leaflet ends a
  // zoom animation on a 250ms timer that map.remove() doesn't cancel; if it fires after the
  // map is removed it throws "Cannot read properties of undefined (reading '_leaflet_pos')".
  // A layout-effect cleanup runs before MapContainer's map.remove() (a passive cleanup), so
  // the map is still alive here: finish the zoom now (the timer then does nothing) and stop
  // pan/fly. _animatingZoom/_onZoomTransitionEnd are Leaflet internals (no public API).
  useLayoutEffect(() => {
    return () => {
      const m = map as LeafletMap & { _animatingZoom?: boolean; _onZoomTransitionEnd?: () => void };
      if (m._animatingZoom && typeof m._onZoomTransitionEnd === 'function') {
        m._onZoomTransitionEnd();
      }
      map.stop();
    };
  }, [map]);

  return null;
};

export default MapViewUpdater;
