import React, { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Place } from '@/types/business';
import { cn } from '@/lib/utils';
import { useBusinessBookmarks } from '@/hooks/useBusinessBookmarks';
import { useAuth } from '@/context/auth';
import CompactPlaceCard from './CompactPlaceCard';

export interface StripScrollRequest {
  /** Bumped for every request, so the same card can be scrolled to again */
  seq: number;
  /** No animation (opening from a pin, rebuilding the list) */
  instant: boolean;
  /** Move focus to the selected card (the pin was activated from the keyboard) */
  focus: boolean;
}

interface MapCardStripProps {
  places: Place[];
  selectedId: string;
  scrollRequest: StripScrollRequest;
  onSelect: (id: string) => void;
  onOpen: (id: string) => void;
  /** Hidden but mounted (on-screen keyboard open) */
  hidden?: boolean | undefined;
}

/**
 * Swipeable strip of business cards above the bottom nav. The card snapped to
 * the start is the selection (its pin is highlighted); tapping a card opens
 * the full drawer.
 */
const MapCardStrip: React.FC<MapCardStripProps> = ({
  places,
  selectedId,
  scrollRequest,
  onSelect,
  onOpen,
  hidden = false,
}) => {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const buttonRefs = useRef(new Map<string, HTMLButtonElement>());
  // While scrolling to a card in code, ignore the cards passed on the way
  const targetRef = useRef<string | null>(null);
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  // One bookmark source for the whole strip (not one fetch per card); optimistic
  // updates and cross-tab sync come from the shared hook
  const { isAuthenticated } = useAuth();
  const { isBookmarked, toggleBookmark, isLoading: bookmarksLoading } = useBusinessBookmarks();
  const [pendingBookmarkId, setPendingBookmarkId] = useState<string | null>(null);
  const handleBookmarkToggle = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!isAuthenticated) {
      toast.error('Please sign in to bookmark businesses');
      return;
    }
    setPendingBookmarkId(id);
    try {
      await toggleBookmark(id);
    } catch (error) {
      console.error('Error toggling bookmark:', error);
      toast.error('Failed to update bookmark');
    } finally {
      setPendingBookmarkId(null);
    }
  };

  const cardEl = (id: string) =>
    scrollerRef.current?.querySelector<HTMLElement>(`[data-strip-card="${CSS.escape(id)}"]`) ?? null;

  // Scroll to the selected card when asked (pin tap, list rebuilt)
  useEffect(() => {
    const scroller = scrollerRef.current;
    const card = cardEl(selectedId);
    if (!scroller || !card) return;
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    targetRef.current = selectedId;
    const left = card.offsetLeft - parseFloat(getComputedStyle(scroller).scrollPaddingLeft || '0');
    // Already there: nothing will scroll, so don't wait for the observer
    if (Math.abs(scroller.scrollLeft - left) < 2) targetRef.current = null;
    scroller.scrollTo({ left, behavior: scrollRequest.instant || reduceMotion ? 'auto' : 'smooth' });
    if (scrollRequest.focus) buttonRefs.current.get(selectedId)?.focus({ preventScroll: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runs per request, not per selection
  }, [scrollRequest.seq]);

  // The card snapped to the start (fully visible, leftmost) becomes the selection
  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const ratios = new Map<string, number>();
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const id = (entry.target as HTMLElement).dataset['stripCard'];
          if (id) ratios.set(id, entry.intersectionRatio);
        }
        const visible = places.map((p) => p.id).filter((id) => (ratios.get(id) ?? 0) >= 0.9);
        const first = visible[0];
        if (!first) return;
        if (targetRef.current) {
          if (!visible.includes(targetRef.current)) return;
          targetRef.current = null;
          return;
        }
        onSelectRef.current(first);
      },
      { root: scroller, threshold: [0, 0.5, 0.9, 1] }
    );
    scroller.querySelectorAll('[data-strip-card]').forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [places]);

  const moveBy = (dir: -1 | 1) => {
    const index = places.findIndex((p) => p.id === selectedId);
    const next = places[index + dir];
    if (!next) return;
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    buttonRefs.current.get(next.id)?.focus({ preventScroll: true });
    cardEl(next.id)?.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'nearest', inline: 'start' });
  };

  const index = places.findIndex((p) => p.id === selectedId);
  const selected = places[index];

  return (
    <div
      role="region"
      aria-label="Businesses in this area"
      data-map-strip
      data-map-bottom-anchor
      aria-hidden={hidden || undefined}
      inert={hidden}
      className={cn(
        'absolute inset-x-0 bottom-[calc(76px+env(safe-area-inset-bottom))] z-20 transition-opacity duration-150 motion-reduce:transition-none md:pl-[264px]',
        hidden && 'pointer-events-none opacity-0'
      )}
    >
      <div
        ref={scrollerRef}
        // -my-1 py-1: room for the card shadows without changing the strip's height
        className="-my-1 flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 py-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {places.map((place) => (
          <CompactPlaceCard
            key={place.id}
            variant="strip"
            place={place}
            selected={place.id === selectedId}
            onOpen={() => onOpen(place.id)}
            onArrow={moveBy}
            isBookmarked={isBookmarked(place.id)}
            onBookmarkToggle={(e) => handleBookmarkToggle(e, place.id)}
            // While the list loads every card waits; during a toggle only that card does
            bookmarkLoading={pendingBookmarkId ? pendingBookmarkId === place.id : bookmarksLoading}
            buttonRef={(el) => {
              if (el) buttonRefs.current.set(place.id, el);
              else buttonRefs.current.delete(place.id);
            }}
          />
        ))}
      </div>
      <p className="sr-only" aria-live="polite">
        {selected ? `${selected.name}, ${index + 1} of ${places.length}` : ''}
      </p>
    </div>
  );
};

export default MapCardStrip;
