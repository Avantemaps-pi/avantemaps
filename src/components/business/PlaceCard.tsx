import React from 'react';
import { useNavigate } from '@/lib/router-compat';
import { Place } from '@/types/business';
import CategoryBadge from '@/components/business/CategoryBadge';
import ProgressiveImage from './ProgressiveImage';
import HighlightText from './HighlightText';
import PlaceCardRating from './PlaceCardRating';
import PlaceCardButtonRow from './PlaceCardButtonRow';
import { useBookmark } from '@/hooks/useBookmark';
import BookmarkButton from '@/components/map/buttons/BookmarkButton';
import { Button } from '@/components/ui/button';
import { CircleCheck, Info, MapPin, ShieldCheck, Store } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PlaceCardProps {
  place: Place;
  onPlaceClick: (placeId: string, zoomToLocation?: boolean) => void;
  onRemove?: (placeId: string) => void;
  className?: string;
  /** @deprecated Ignored: details now open in the map drawer. */
  showDetails?: boolean;
  isBookmarked?: boolean;
  previewMode?: boolean;
  disableRating?: boolean;
  disableBookmark?: boolean;
  /** @deprecated Ignored: list cards always show one photo. */
  singleImageOnly?: boolean;
  /** @deprecated Ignored: list cards have no gallery. */
  hideGalleryIndicators?: boolean;
  highlightQuery?: string;
}

const PLACEHOLDER = '/placeholder.svg';

const PlaceCard: React.FC<PlaceCardProps> = ({
  place,
  onPlaceClick,
  onRemove,
  className,
  isBookmarked: initialIsBookmarked = false,
  previewMode = false,
  disableRating = false,
  disableBookmark = false,
  highlightQuery,
}) => {
  const navigate = useNavigate();

  const { isBookmarked, handleBookmarkToggle, isLoading: isBookmarkLoading } = useBookmark({
    initialIsBookmarked,
    onRemove,
    id: place.id
  });

  const handleRatingClick = () => {
    navigate(`/review/${place.id}`, {
      state: {
        businessDetails: place
      }
    });
  };

  // Details, the name and the photo all open the business's drawer on the map
  const handlePlaceClick = () => {
    if (window.location.pathname === '/') {
      onPlaceClick(place.id);
    } else {
      navigate('/', { state: { selectedPlaceId: place.id } });
    }
  };

  const category = place.category.split(',').map(cat => cat.trim()).find(Boolean) ?? '';
  const image = place.images?.[0] || place.image;
  const hasImage = !!image && image !== PLACEHOLDER;
  const isPending = place.verificationStatus === 'pending' && !place.isVerified;

  // Keep the status icon attached to the last word so it never wraps on its own
  const trimmedName = place.name.trim();
  const lastSpace = trimmedName.lastIndexOf(' ');
  const nameHead = trimmedName.slice(0, lastSpace + 1);
  const nameLast = trimmedName.slice(lastSpace + 1);
  const StatusIcon = place.isCertified ? ShieldCheck : place.isVerified ? CircleCheck : null;
  const statusLabel = place.isCertified ? 'Certified' : 'Verified';
  const titleId = `place-card-title-${place.id}`;

  const name = (
    <>
      <HighlightText text={nameHead} query={highlightQuery} />
      <span className="whitespace-nowrap">
        <HighlightText text={nameLast} query={highlightQuery} />
        {StatusIcon && (
          <>
            <StatusIcon className="ml-1 inline-block h-[18px] w-[18px] align-[-3px] text-primary" aria-hidden="true" />
            <span className="sr-only"> ({statusLabel})</span>
          </>
        )}
      </span>
    </>
  );

  return (
    <article
      aria-labelledby={titleId}
      className={cn(
        'flex flex-col overflow-hidden rounded-xl border border-border bg-card text-card-foreground shadow-card',
        className
      )}
    >
      {/* Media: decorative duplicate of the name/Details action, so hidden from AT */}
      <div
        aria-hidden="true"
        onClick={previewMode ? undefined : handlePlaceClick}
        className={cn('relative aspect-video bg-muted', !previewMode && 'cursor-pointer')}
      >
        {hasImage ? (
          <ProgressiveImage
            src={image}
            alt=""
            className="h-full w-full object-cover"
            loading="lazy"
            onError={(e) => {
              e.currentTarget.src = PLACEHOLDER;
            }}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Store className="h-8 w-8 text-muted-foreground" />
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 id={titleId} className="min-w-0 flex-1 text-[17px] leading-6 font-semibold text-foreground break-words">
            {previewMode ? (
              name
            ) : (
              <button
                type="button"
                onClick={handlePlaceClick}
                className="rounded-sm bg-transparent p-0 text-left"
              >
                {name}
              </button>
            )}
          </h3>
          {!disableBookmark && (
            <div className="-mt-2.5 -mr-2.5 shrink-0" inert={previewMode || undefined}>
              <BookmarkButton
                isBookmarked={isBookmarked}
                onToggle={handleBookmarkToggle}
                isLoading={isBookmarkLoading}
              />
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <PlaceCardRating
            rating={place.rating}
            totalReviews={place.totalReviews}
            onClick={(previewMode || disableRating) ? undefined : handleRatingClick}
          />
          <CategoryBadge category={category} />
          {isPending && <CategoryBadge category="Pending verification" tone="outline" />}
        </div>

        {place.address && (
          <div className="flex items-start gap-1">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            <span className="line-clamp-2 text-sm leading-5 text-muted-foreground">
              <HighlightText text={place.address} query={highlightQuery} />
            </span>
          </div>
        )}

        <div className="mt-auto pt-2" inert={previewMode || undefined}>
          <PlaceCardButtonRow
            place={place}
            secondaryAction={
              <Button
                type="button"
                variant="outline"
                onClick={handlePlaceClick}
                className="h-11 sm:h-11 rounded-md border-input bg-transparent px-4 text-sm font-semibold text-foreground hover:bg-accent [&_svg]:size-[18px] sm:[&_svg]:size-[18px]"
              >
                <Info />
                Details
              </Button>
            }
          />
        </div>
      </div>
    </article>
  );
};

export default PlaceCard;
