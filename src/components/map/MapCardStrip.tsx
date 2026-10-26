import React, { useEffect, useRef } from 'react';
import { CircleCheck, ShieldCheck, Store } from 'lucide-react';
import { Place } from '@/types/business';
import { cn } from '@/lib/utils';
import { useBookmark } from '@/hooks/useBookmark';
import BookmarkButton from './buttons/BookmarkButton';
import PlaceCardRating from '@/components/business/PlaceCardRating';
import { todayHoursLabel } from '@/components/business/formatHours';

const NO_IMAGE = '/placeholder.svg';

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

// Category plus today's hours, written as in the drawer
const summaryOf = (place: Place) => {
  const category = place.category?.split(',').map((c) => c.trim()).find(Boolean) ?? '';
  return [category, todayHoursLabel(place.hours)].filter(Boolean).join(' · ');
};

const StripCard: React.FC<{
  place: Place;
  selected: boolean;
  onOpen: () => void;
  onArrow: (dir: -1 | 1) => void;
  buttonRef: (el: HTMLButtonElement | null) => void;
}> = ({ place, selected, onOpen, onArrow, buttonRef }) => {
  const { isBookmarked, handleBookmarkToggle, isLoading } = useBookmark({
    initialIsBookmarked: false,
    id: place.id,
  });
  const image = (place.images?.find((src) => src && src !== NO_IMAGE) ?? (place.image !== NO_IMAGE ? place.image : undefined)) || undefined;
  const summary = summaryOf(place);

  // Keep the status icon attached to the last word so it never wraps on its own
  const trimmedName = place.name.trim();
  const lastSpace = trimmedName.lastIndexOf(' ');
  const nameHead = trimmedName.slice(0, lastSpace + 1);
  const nameLast = trimmedName.slice(lastSpace + 1);
  const StatusIcon = place.isCertified ? ShieldCheck : place.isVerified ? CircleCheck : null;

  return (
    <article
      data-strip-card={place.id}
      aria-current={selected || undefined}
      className={cn(
        'relative flex h-[124px] w-[min(311px,calc(100vw-64px))] shrink-0 snap-start gap-3 rounded-xl bg-card text-card-foreground shadow-float',
        selected ? 'border-2 border-primary p-[11px]' : 'border border-border p-3'
      )}
    >
      {/* Whole card opens the drawer; Save sits above it as its own control */}
      <button
        ref={buttonRef}
        type="button"
        onClick={onOpen}
        onKeyDown={(e) => {
          if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
            e.preventDefault();
            onArrow(e.key === 'ArrowRight' ? 1 : -1);
          }
        }}
        aria-label={[place.name, summary].filter(Boolean).join(', ')}
        className="absolute inset-0 z-0 rounded-xl focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      />
      <div className="pointer-events-none flex h-[100px] w-[100px] shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted" aria-hidden="true">
        {image ? (
          <img src={image} alt="" loading="lazy" className="h-full w-full object-cover" />
        ) : (
          <Store className="h-8 w-8 text-muted-foreground" />
        )}
      </div>
      {/* 2-line name (40) + rating (20) + 2-line summary (36) + gaps (4) = the photo's 100px */}
      <div className="pointer-events-none flex min-w-0 flex-1 flex-col gap-0.5" aria-hidden="true">
        {/* pr-8 keeps the name clear of Save in the top-right corner */}
        <p className="line-clamp-2 pr-8 text-[15px] leading-5 font-semibold text-foreground break-words">
          {nameHead}
          <span className="whitespace-nowrap">
            {nameLast}
            {StatusIcon && (
              <StatusIcon className="ml-1 inline-block h-4 w-4 align-[-2px] text-primary" />
            )}
          </span>
        </p>
        <div className="whitespace-nowrap">
          <PlaceCardRating rating={place.rating} totalReviews={place.totalReviews} onClick={undefined} />
        </div>
        {summary && <p className="line-clamp-2 text-[13px] leading-[18px] text-muted-foreground">{summary}</p>}
      </div>
      <div className="absolute right-1 top-1 z-10">
        <BookmarkButton isBookmarked={isBookmarked} onToggle={handleBookmarkToggle} isLoading={isLoading} />
      </div>
    </article>
  );
};

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
          <StripCard
            key={place.id}
            place={place}
            selected={place.id === selectedId}
            onOpen={() => onOpen(place.id)}
            onArrow={moveBy}
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
