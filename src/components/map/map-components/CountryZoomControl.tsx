import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useMap } from 'react-leaflet';
import { Plus, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Zoom level considered "country view". */
const COUNTRY_ZOOM = 5;

/** Vertical gap between the + (Add Business) button and the zoom control. */
const GAP_PX = 16;
/** Fallback offset (px from viewport bottom) if the + button isn't found. */
const FALLBACK_BOTTOM = 152;

/**
 * Floating +/- control for country-level zoom.
 *
 * Position is computed dynamically against the AddBusinessButton's bounding box
 * so it stays directly above it across:
 *   - viewport resize / orientation change
 *   - font scaling (which changes the + button's height)
 *   - the AddBusinessButton sliding when a place is selected
 */
const CountryZoomControl: React.FC = () => {
  const map = useMap();
  const [zoom, setZoom] = useState<number>(map.getZoom());
  const [bottom, setBottom] = useState<number>(FALLBACK_BOTTOM);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Track zoom level for enable/disable state
  useEffect(() => {
    const onZoom = () => setZoom(map.getZoom());
    map.on('zoomend', onZoom);
    return () => {
      map.off('zoomend', onZoom);
    };
  }, [map]);

  // Reposition above the Add Business button on any layout change
  useLayoutEffect(() => {
    const mapEl = map.getContainer();

    const recompute = () => {
      const addBtn = document.querySelector<HTMLElement>('[data-add-business-button]');
      if (!addBtn) {
        setBottom(FALLBACK_BOTTOM);
        return;
      }
      const mapRect = mapEl.getBoundingClientRect();
      const btnRect = addBtn.getBoundingClientRect();
      // Distance from map's bottom edge up to the top of the + button + gap
      const next = Math.max(0, mapRect.bottom - btnRect.top + GAP_PX);
      setBottom(next);
    };

    recompute();

    // 1. Viewport / orientation
    window.addEventListener('resize', recompute);
    window.addEventListener('orientationchange', recompute);

    // 2. Map container size (Leaflet emits this on programmatic resizes too)
    map.on('resize', recompute);

    // 3. Layout shifts of the map or the + button (font scaling, sidebar, etc.)
    const ro = new ResizeObserver(recompute);
    ro.observe(mapEl);
    const addBtn = document.querySelector<HTMLElement>('[data-add-business-button]');
    if (addBtn) ro.observe(addBtn);

    // 4. The + button slides horizontally / re-renders when a place is selected.
    //    Watch for class/style changes on it and on its subtree.
    let mo: MutationObserver | null = null;
    if (addBtn) {
      mo = new MutationObserver(recompute);
      mo.observe(addBtn, {
        attributes: true,
        attributeFilter: ['class', 'style'],
        childList: true,
        subtree: true,
      });
    }

    // 5. After CSS transitions on the + button finish, re-measure once.
    const onTransitionEnd = () => recompute();
    addBtn?.addEventListener('transitionend', onTransitionEnd);

    return () => {
      window.removeEventListener('resize', recompute);
      window.removeEventListener('orientationchange', recompute);
      map.off('resize', recompute);
      ro.disconnect();
      mo?.disconnect();
      addBtn?.removeEventListener('transitionend', onTransitionEnd);
    };
  }, [map]);

  const plusDisabled = zoom >= COUNTRY_ZOOM;
  const minusDisabled = zoom <= COUNTRY_ZOOM;
  const goToCountry = () => map.setZoom(COUNTRY_ZOOM);

  const btn =
    'w-9 h-9 flex items-center justify-center bg-background text-foreground ' +
    'transition-colors hover:bg-accent disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-background';

  return (
    <div
      ref={containerRef}
      className="absolute right-6 z-[20]"
      style={{ bottom }}
    >
      <div
        className="rounded-md overflow-hidden border border-border shadow-md bg-background"
        onMouseDown={(e) => e.stopPropagation()}
        onDoubleClick={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          aria-label="Zoom to country level"
          disabled={plusDisabled}
          onClick={goToCountry}
          className={cn(btn, 'border-b border-border')}
        >
          <Plus className="w-4 h-4" />
        </button>
        <button
          type="button"
          aria-label="Zoom out to country level"
          disabled={minusDisabled}
          onClick={goToCountry}
          className={btn}
        >
          <Minus className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default CountryZoomControl;
