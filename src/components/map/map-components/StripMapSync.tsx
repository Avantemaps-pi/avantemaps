import { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import { Place } from '@/types/business';

interface StripMapSyncProps {
  places: Place[];
  /** Business shown by the card strip; its pin is panned into view when it changes */
  selectedId: string | null;
  /** Bumped by the strip on every selection, so re-selecting the same card re-checks */
  selectionSeq: number;
  onEmptyMapClick?: (() => void) | undefined;
  /** The user dragged or zoomed the map (not code: popup auto-pan, our own pans, setView) */
  onUserMoveEnd?: ((bounds: L.LatLngBounds) => void) | undefined;
}

// A zoom counts as the user's when it follows a gesture on the map within this window
// (pinch, wheel, double-tap, the zoom buttons)
const GESTURE_WINDOW_MS = 1500;

/**
 * Keeps the map in step with the card strip: reports taps on empty map and moves
 * the user made, and pans the selected pin into the area between the top stack
 * and the strip without zooming.
 */
const StripMapSync: React.FC<StripMapSyncProps> = ({
  places,
  selectedId,
  selectionSeq,
  onEmptyMapClick,
  onUserMoveEnd,
}) => {
  const map = useMap();
  const callbacks = useRef({ onEmptyMapClick, onUserMoveEnd });
  callbacks.current = { onEmptyMapClick, onUserMoveEnd };

  useEffect(() => {
    const container = map.getContainer();
    let gestureAt = 0;
    const onGesture = () => {
      gestureAt = Date.now();
    };
    // Capture phase: the zoom buttons stop propagation, but still count as the user's
    container.addEventListener('pointerdown', onGesture, true);
    container.addEventListener('wheel', onGesture, { capture: true, passive: true });

    // Marker and cluster clicks don't bubble to the map, so this is empty map only
    const onClick = () => callbacks.current.onEmptyMapClick?.();
    const onDragEnd = () => callbacks.current.onUserMoveEnd?.(map.getBounds());
    const onZoomEnd = () => {
      if (Date.now() - gestureAt < GESTURE_WINDOW_MS) callbacks.current.onUserMoveEnd?.(map.getBounds());
    };
    map.on('click', onClick);
    map.on('dragend', onDragEnd);
    map.on('zoomend', onZoomEnd);
    return () => {
      container.removeEventListener('pointerdown', onGesture, true);
      container.removeEventListener('wheel', onGesture, true);
      map.off('click', onClick);
      map.off('dragend', onDragEnd);
      map.off('zoomend', onZoomEnd);
    };
  }, [map]);

  // Pan the selected pin into the visible area above the strip, if it's outside it
  useEffect(() => {
    if (!selectedId) return;
    const place = places.find((p) => p.id === selectedId);
    const pos = place?.position ?? place?.location;
    if (!pos) return;
    const frame = requestAnimationFrame(() => {
      const mapRect = map.getContainer().getBoundingClientRect();
      const topStack = document.querySelector('[data-map-top-stack]')?.getBoundingClientRect();
      const strip = document.querySelector('[data-map-strip]')?.getBoundingClientRect();
      const top = (topStack ? topStack.bottom : mapRect.top) - mapRect.top;
      const bottom = (strip ? strip.top : mapRect.bottom) - mapRect.top;
      const margin = 24;
      const point = map.latLngToContainerPoint([pos.lat, pos.lng]);
      const inside =
        point.y >= top + margin &&
        point.y <= bottom - margin &&
        point.x >= margin &&
        point.x <= mapRect.width - margin;
      if (inside || bottom <= top) return;
      // Move the pin to the middle of the visible area: shift the centre by the offset
      const target = L.point(mapRect.width / 2, (top + bottom) / 2);
      const centre = map.getSize().divideBy(2).add(point.subtract(target));
      const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
      map.panTo(map.containerPointToLatLng(centre), { animate: !reduceMotion });
    });
    return () => cancelAnimationFrame(frame);
  }, [map, places, selectedId, selectionSeq]);

  return null;
};

export default StripMapSync;
