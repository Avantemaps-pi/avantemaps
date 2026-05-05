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
  const [right, setRight] = useState<number>(24);
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
    let trackedBtn: HTMLElement | null = null;
    let ro: ResizeObserver | null = null;
    let mo: MutationObserver | null = null;
    let bodyObserver: MutationObserver | null = null;
    let pollId: number | null = null;
    let pollAttempts = 0;
    const MAX_POLL_ATTEMPTS = 20; // bounded discovery window
    // Exponential backoff for discovery polling: 100ms → 200 → 400 → … (cap 1.5s)
    const POLL_BASE_MS = 100;
    const POLL_MAX_MS = 1500;
    const nextPollDelay = () =>
      Math.min(POLL_MAX_MS, POLL_BASE_MS * Math.pow(2, pollAttempts));

    // rAF-based coalescing for tight bursts (resize / scroll / transition).
    let rafId: number | null = null;
    // Trailing debounce for noisier sources (MutationObserver) once the
    // button is being tracked — collapses long mutation storms into a single
    // measurement after things settle.
    let debounceId: number | null = null;
    const DEBOUNCE_MS = 80;

    const scheduleRecompute = () => {
      if (rafId !== null) return;
      rafId = window.requestAnimationFrame(() => {
        rafId = null;
        recompute();
      });
    };
    const debouncedRecompute = () => {
      if (debounceId !== null) window.clearTimeout(debounceId);
      debounceId = window.setTimeout(() => {
        debounceId = null;
        scheduleRecompute();
      }, DEBOUNCE_MS);
    };


    /**
     * Resolve the "+" Add Business button using a prioritized list of selectors.
     * This is resilient to:
     *   - the canonical [data-add-business-button] hook being removed
     *   - the button being relocated (mobile/desktop layouts)
     *   - aria-label or routing-based variants
     * Returns the first match that is actually laid out (non-zero size).
     */
    const ADD_BTN_SELECTORS = [
      '[data-add-business-button]',
      '[data-testid="add-business-button"]',
      'a[href="/registration"] button',
      'a[href^="/registration"]',
      'button[aria-label="Register a business"]',
      'button[aria-label*="business" i][aria-label*="add" i]',
      'button[aria-label*="business" i][aria-label*="register" i]',
    ];
    const findAddButton = (): HTMLElement | null => {
      for (const sel of ADD_BTN_SELECTORS) {
        const candidates = document.querySelectorAll<HTMLElement>(sel);
        for (const el of candidates) {
          const r = el.getBoundingClientRect();
          if (r.width > 0 && r.height > 0) return el;
        }
      }
      // Last-resort: return the first match even if not yet laid out
      for (const sel of ADD_BTN_SELECTORS) {
        const el = document.querySelector<HTMLElement>(sel);
        if (el) return el;
      }
      return null;
    };

    /** Selectors for map UI we must NOT overlap. */
    const OBSTACLE_SELECTORS = [
      '[data-search-bar]',
      '.leaflet-control-container .leaflet-top',
      '.leaflet-popup',
      '.leaflet-tooltip',
      '.leaflet-control-zoom',
      '.leaflet-control-attribution',
    ];

    /** Estimated control size (w x h) — kept in sync with the rendered markup. */
    const CONTROL_W = 36;
    const CONTROL_H = 72;
    /** Min margins from map edges. */
    const EDGE_MARGIN = 12;

    const recompute = () => {
      const addBtn = findAddButton();
      if (!addBtn) {
        setBottom(FALLBACK_BOTTOM);
        return;
      }
      const btnRect = addBtn.getBoundingClientRect();
      // If button is rendered but has zero size (not laid out yet), keep fallback
      if (btnRect.height === 0 && btnRect.width === 0) {
        setBottom(FALLBACK_BOTTOM);
        return;
      }

      const mapRect = mapEl.getBoundingClientRect();

      // Horizontal: mirror the Add Business button's right offset so the
      // control slides with it when a place is selected.
      const rightPx = Math.max(EDGE_MARGIN, mapRect.right - btnRect.right);
      setRight(rightPx);

      // Vertical: 16px above the + button, then clamped against obstacles.
      let bottomPx = Math.max(EDGE_MARGIN, mapRect.bottom - btnRect.top + GAP_PX);

      // Collision avoidance: project the control's would-be rect and bump it
      // up if it overlaps any known map UI (search bar, popups, tooltips,
      // leaflet controls). We only push UP because horizontal anchoring is
      // already tied to the + button.
      const projectedTop = mapRect.bottom - bottomPx - CONTROL_H;
      const projectedLeft = mapRect.right - rightPx - CONTROL_W;
      const projectedRight = mapRect.right - rightPx;
      const projectedBottom = mapRect.bottom - bottomPx;

      let pushUp = 0;
      for (const sel of OBSTACLE_SELECTORS) {
        document.querySelectorAll<HTMLElement>(sel).forEach((el) => {
          const r = el.getBoundingClientRect();
          if (r.width === 0 || r.height === 0) return;
          const overlapsX = r.right > projectedLeft && r.left < projectedRight;
          const overlapsY = r.bottom > projectedTop && r.top < projectedBottom;
          if (overlapsX && overlapsY) {
            // How much we'd need to lift the control to clear this element.
            const lift = projectedBottom - (r.top - GAP_PX);
            if (lift > pushUp) pushUp = lift;
          }
        });
      }
      if (pushUp > 0) bottomPx += pushUp;

      // Final safety clamp so we never escape the map container.
      const maxBottom = Math.max(EDGE_MARGIN, mapRect.height - CONTROL_H - EDGE_MARGIN);
      if (bottomPx > maxBottom) bottomPx = maxBottom;

      setBottom(bottomPx);

      // Attach observers/listeners to the button the first time we see it
      if (addBtn !== trackedBtn) {
        if (trackedBtn) {
          ro?.unobserve(trackedBtn);
          trackedBtn.removeEventListener('transitionend', scheduleRecompute);
        }
        trackedBtn = addBtn;
        ro?.observe(addBtn);
        mo?.disconnect();
        // Narrow scope: only attribute mutations on the button itself can
        // affect its position. Skip childList/subtree to avoid noise from
        // icon swaps or descendant updates. Use trailing debounce since
        // class/style toggles often arrive in rapid bursts.
        mo = new MutationObserver(debouncedRecompute);
        mo.observe(addBtn, {
          attributes: true,
          attributeFilter: ['class', 'style'],
        });
        addBtn.addEventListener('transitionend', scheduleRecompute);

        // Found it — tear down discovery machinery (polling + body observer)
        if (pollId !== null) {
          window.clearTimeout(pollId);
          pollId = null;
        }
        bodyObserver?.disconnect();
        bodyObserver = null;
      }
    };

    // Core observers — all funnel through scheduleRecompute (rAF-coalesced)
    ro = new ResizeObserver(scheduleRecompute);
    ro.observe(mapEl);

    // Window-level
    window.addEventListener('resize', scheduleRecompute);
    window.addEventListener('orientationchange', scheduleRecompute);
    map.on('resize', scheduleRecompute);

    recompute();

    // Fallback strategy when the + button isn't in the DOM yet
    // (lazy Suspense boundary, route transition, conditional render, etc.)
    if (!trackedBtn) {
      // a) Backoff polling — 100ms → 200 → 400 → … capped at 1.5s, ~20 attempts
      const tick = () => {
        pollAttempts += 1;
        scheduleRecompute();
        if (trackedBtn || pollAttempts >= MAX_POLL_ATTEMPTS) {
          if (pollId !== null) {
            window.clearTimeout(pollId);
            pollId = null;
          }
          return;
        }
        pollId = window.setTimeout(tick, nextPollDelay());
      };
      pollId = window.setTimeout(tick, POLL_BASE_MS);


      // b) Watch the document for the button being added. Subtree childList
      //    is necessary (we don't know where it'll be inserted) but we
      //    debounce so a burst of unrelated DOM activity doesn't spam
      //    recompute. Once the button is found, recompute() disconnects
      //    this observer entirely.
      bodyObserver = new MutationObserver(debouncedRecompute);
      bodyObserver.observe(document.body, {
        childList: true,
        subtree: true,
      });
    }

    return () => {
      window.removeEventListener('resize', scheduleRecompute);
      window.removeEventListener('orientationchange', scheduleRecompute);
      map.off('resize', scheduleRecompute);
      ro?.disconnect();
      mo?.disconnect();
      bodyObserver?.disconnect();
      if (pollId !== null) window.clearTimeout(pollId);
      if (rafId !== null) window.cancelAnimationFrame(rafId);
      if (debounceId !== null) window.clearTimeout(debounceId);
      trackedBtn?.removeEventListener('transitionend', scheduleRecompute);
    };
  }, [map]);

  const plusDisabled = zoom >= COUNTRY_ZOOM;
  const minusDisabled = zoom <= COUNTRY_ZOOM;
  const atCountry = zoom === COUNTRY_ZOOM;
  const goToCountry = () => map.setZoom(COUNTRY_ZOOM);

  const btnBase =
    'w-9 h-9 flex items-center justify-center transition-colors ' +
    'bg-background text-foreground hover:bg-accent hover:text-accent-foreground ' +
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 ' +
    'disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-background disabled:hover:text-foreground';

  return (
    <div
      ref={containerRef}
      className={cn(
        'absolute right-6 z-[20] transition-shadow',
        atCountry && 'ring-2 ring-primary/60 rounded-md shadow-lg'
      )}
      style={{ bottom }}
      aria-label={atCountry ? 'Map is at country zoom level' : undefined}
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
          aria-disabled={plusDisabled}
          title={plusDisabled ? 'Already at country zoom' : 'Zoom in to country view'}
          disabled={plusDisabled}
          onClick={goToCountry}
          className={cn(btnBase, 'border-b border-border')}
        >
          <Plus className="w-4 h-4" />
        </button>
        <button
          type="button"
          aria-label="Zoom out to country level"
          aria-disabled={minusDisabled}
          title={minusDisabled ? 'Already at country zoom' : 'Zoom out to country view'}
          disabled={minusDisabled}
          onClick={goToCountry}
          className={btnBase}
        >
          <Minus className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default CountryZoomControl;
