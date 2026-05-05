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
    let trackedBtn: HTMLElement | null = null;
    let ro: ResizeObserver | null = null;
    let mo: MutationObserver | null = null;
    let bodyObserver: MutationObserver | null = null;
    let pollId: number | null = null;
    let pollAttempts = 0;
    const MAX_POLL_ATTEMPTS = 40; // ~4s at 100ms

    // rAF-based coalescing: collapse bursts of events (resize, font scale,
    // transitions, mutations) into a single measurement per frame to avoid
    // layout thrashing.
    let rafId: number | null = null;
    const scheduleRecompute = () => {
      if (rafId !== null) return;
      rafId = window.requestAnimationFrame(() => {
        rafId = null;
        recompute();
      });
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
      const next = Math.max(0, mapRect.bottom - btnRect.top + GAP_PX);
      setBottom(next);

      // Attach observers/listeners to the button the first time we see it
      if (addBtn !== trackedBtn) {
        if (trackedBtn) {
          ro?.unobserve(trackedBtn);
          trackedBtn.removeEventListener('transitionend', scheduleRecompute);
        }
        trackedBtn = addBtn;
        ro?.observe(addBtn);
        mo?.disconnect();
        mo = new MutationObserver(scheduleRecompute);
        mo.observe(addBtn, {
          attributes: true,
          attributeFilter: ['class', 'style'],
          childList: true,
          subtree: true,
        });
        addBtn.addEventListener('transitionend', scheduleRecompute);
        // Found it — stop polling and stop observing body for it
        if (pollId !== null) {
          window.clearInterval(pollId);
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
      // a) Poll briefly — cheap and bounded
      pollId = window.setInterval(() => {
        pollAttempts += 1;
        scheduleRecompute();
        if (trackedBtn || pollAttempts >= MAX_POLL_ATTEMPTS) {
          if (pollId !== null) {
            window.clearInterval(pollId);
            pollId = null;
          }
        }
      }, 100);

      // b) Watch the document for the button being added or its
      //    data attribute appearing later.
      bodyObserver = new MutationObserver(scheduleRecompute);
      bodyObserver.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['data-add-business-button'],
      });
    }

    return () => {
      window.removeEventListener('resize', scheduleRecompute);
      window.removeEventListener('orientationchange', scheduleRecompute);
      map.off('resize', scheduleRecompute);
      ro?.disconnect();
      mo?.disconnect();
      bodyObserver?.disconnect();
      if (pollId !== null) window.clearInterval(pollId);
      if (rafId !== null) window.cancelAnimationFrame(rafId);
      trackedBtn?.removeEventListener('transitionend', scheduleRecompute);
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
