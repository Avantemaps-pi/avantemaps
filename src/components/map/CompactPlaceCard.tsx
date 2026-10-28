import React from 'react';
import { CircleCheck, ShieldCheck, Store } from 'lucide-react';
import { Place } from '@/types/business';
import { cn } from '@/lib/utils';
import BookmarkButton from './buttons/BookmarkButton';
import PlaceCardRating from '@/components/business/PlaceCardRating';
import { todayHoursLabel } from '@/components/business/formatHours';

const NO_IMAGE = '/placeholder.svg';

const categoryOf = (place: Place) => place.category?.split(',').map((c) => c.trim()).find(Boolean) ?? '';

// Category plus today's hours, written as in the drawer (the card's accessible name)
const summaryOf = (place: Place) => [categoryOf(place), todayHoursLabel(place.hours)].filter(Boolean).join(' · ');

interface CompactPlaceCardProps {
  place: Place;
  /** 'strip': fixed width, snaps in the map card strip; 'list': full width in the list view */
  variant: 'strip' | 'list';
  selected: boolean;
  onOpen: () => void;
  onArrow?: ((dir: -1 | 1) => void) | undefined;
  buttonRef?: ((el: HTMLButtonElement | null) => void) | undefined;
  isBookmarked: boolean;
  onBookmarkToggle: (e: React.MouseEvent) => void;
  bookmarkLoading: boolean;
}

/**
 * The 124px business card used by the map card strip and the list view:
 * photo, name with its status icon, rating, category and today's hours, Save.
 * The whole card opens the drawer; Save sits above it as its own control.
 */
const CompactPlaceCard: React.FC<CompactPlaceCardProps> = ({
  place,
  variant,
  selected,
  onOpen,
  onArrow,
  buttonRef,
  isBookmarked,
  onBookmarkToggle,
  bookmarkLoading,
}) => {
  const image = (place.images?.find((src) => src && src !== NO_IMAGE) ?? (place.image !== NO_IMAGE ? place.image : undefined)) || undefined;
  const summary = summaryOf(place);
  const category = categoryOf(place);
  const hours = todayHoursLabel(place.hours);

  // Keep the status icon attached to the last word so it never wraps on its own
  const trimmedName = place.name.trim();
  const lastSpace = trimmedName.lastIndexOf(' ');
  const nameHead = trimmedName.slice(0, lastSpace + 1);
  const nameLast = trimmedName.slice(lastSpace + 1);
  const StatusIcon = place.isCertified ? ShieldCheck : place.isVerified ? CircleCheck : null;

  return (
    <article
      {...(variant === 'strip' ? { 'data-strip-card': place.id } : { 'data-list-row': place.id })}
      aria-current={selected || undefined}
      className={cn(
        'relative flex h-[124px]',
        variant === 'strip' ? 'w-[min(311px,calc(100vw-64px))] shrink-0 snap-start' : 'w-full',
        'gap-3 rounded-xl bg-card text-card-foreground shadow-float',
        selected ? 'border-2 border-primary p-[11px]' : 'border border-border p-3'
      )}
    >
      {/* Whole card opens the drawer; Save sits above it as its own control */}
      <button
        ref={buttonRef}
        type="button"
        onClick={onOpen}
        onKeyDown={(e) => {
          if (onArrow && (e.key === 'ArrowRight' || e.key === 'ArrowLeft')) {
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
      {/* 2-line name (40) + rating (20) + category and hours lines (36) + gaps (4) = the photo's 100px */}
      <div className="pointer-events-none flex min-w-0 flex-1 flex-col gap-0.5" aria-hidden="true">
        <p className="line-clamp-2 text-[15px] leading-5 font-semibold text-foreground break-words">
          {/* Clears Save on the first line only, so line 2 uses the full width */}
          <span aria-hidden="true" className="float-right h-5 w-8" />
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
        {/* Hours on their own line, so a long category can't push them out of view */}
        {(category || hours) && (
          <div className="text-[13px] leading-[18px] text-muted-foreground">
            {category && <p className="truncate">{category}</p>}
            {hours && <p className="whitespace-nowrap">{hours}</p>}
          </div>
        )}
      </div>
      {/* In the corner, so its icon clears line 2 of the name */}
      <div className="absolute right-0 top-0 z-10">
        <BookmarkButton isBookmarked={isBookmarked} onToggle={onBookmarkToggle} isLoading={bookmarkLoading} />
      </div>
    </article>
  );
};

export default CompactPlaceCard;
