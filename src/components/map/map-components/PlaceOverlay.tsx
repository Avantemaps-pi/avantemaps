import React from 'react';
import { useNavigate } from '@/lib/router-compat';
import { Place } from '@/types/business';
import { CircleCheck, Clock, ImageIcon, Mail, MapPin, Phone, Shield, Star, X } from 'lucide-react';
import { Drawer, DrawerClose, DrawerContent, DrawerDescription, DrawerTitle } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import CategoryBadge from '@/components/business/CategoryBadge';
import ExpandableDescription from '@/components/business/ExpandableDescription';
import BookmarkButton from '../buttons/BookmarkButton';
import PlaceRating from '../place/PlaceRating';
import SwipeableImageGallery from '@/components/business/SwipeableImageGallery';
import PlaceCardButtonRow from '@/components/business/PlaceCardButtonRow';
import { formatHours, todayHours } from '@/components/business/formatHours';
import { useSharePlace } from '@/hooks/useSharePlace';
import { useBookmark } from '@/hooks/useBookmark';

interface PlaceOverlayProps {
  selectedPlace: Place | null;
  showPopover: boolean;
  onOverlayClick: () => void;
  detailCardRef?: React.RefObject<HTMLDivElement> | undefined;
}

// Placeholder values the data hooks fill in when a field is missing
const NO_IMAGE = '/placeholder.svg';
const NO_ADDRESS = 'No address provided';
const NO_DESCRIPTION = 'No description provided';

const PlaceOverlay: React.FC<PlaceOverlayProps> = ({
  selectedPlace,
  showPopover,
  onOverlayClick,
  detailCardRef
}) => {
  if (!selectedPlace) return null;

  return (
    <Drawer
      open={showPopover}
      onOpenChange={(open) => { if (!open) onOverlayClick(); }}
      // No half-height snap point: one swipe down closes. A modal drawer parked
      // at a lower snap left the map and search untappable behind it.
      modal={true}
      dismissible={true}
    >
      <DrawerContent className="z-50 max-h-[96vh] focus:outline-hidden">
        <PlaceOverlayContent
          key={selectedPlace.id}
          place={selectedPlace}
          detailCardRef={detailCardRef}
          onClose={onOverlayClick}
        />
      </DrawerContent>
    </Drawer>
  );
};

// formatHours keeps closed days as 'closed' (todayHoursLabel relies on it); show "Closed"
const hoursText = (hours: string) => (hours === 'closed' ? 'Closed' : hours);

const InfoRow: React.FC<{ icon: React.ElementType; children: React.ReactNode }> = ({ icon: Icon, children }) => (
  <div className="flex min-h-12 items-center gap-3 border-b border-border py-2">
    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent text-primary">
      <Icon className="h-4 w-4" aria-hidden="true" />
    </span>
    <div className="min-w-0 flex-1 text-sm text-foreground">{children}</div>
  </div>
);

// Round 44px button floated over the photo
const floatingButton = 'h-11 w-11 sm:h-11 sm:w-11 rounded-full bg-surface-float shadow-float text-foreground hover:bg-surface-float';

const PlaceOverlayContent: React.FC<{
  place: Place;
  detailCardRef?: React.RefObject<HTMLDivElement> | undefined;
  onClose: () => void;
}> = ({ place, onClose }) => {
  const navigate = useNavigate();
  const { isBookmarked, handleBookmarkToggle, isLoading } = useBookmark({
    initialIsBookmarked: false,
    id: place.id
  });
  const { handleShare } = useSharePlace(place.name, place.id);

  const images = (place.images && place.images.length > 0
    ? place.images
    : (place.image ? [place.image] : [])
  ).filter((src) => src && src !== NO_IMAGE);

  const category = place.category?.split(',').map((c) => c.trim()).find(Boolean) ?? '';
  const address = place.address && place.address !== NO_ADDRESS ? place.address : '';
  const description = place.description && place.description !== NO_DESCRIPTION ? place.description.trim() : '';
  const hours = formatHours(place.hours);
  const today = todayHours(place.hours);
  // No open/closed-now or distance: we don't know the business's time zone
  const todayLabel = today === null ? '' : today === 'closed' ? 'Closed today' : `Today ${today}`;
  const summary = [category, todayLabel].filter(Boolean).join(' · ');
  const trimmedName = place.name.trim();
  const lastSpace = trimmedName.lastIndexOf(' ');
  const nameHead = trimmedName.slice(0, lastSpace + 1);
  const nameLast = trimmedName.slice(lastSpace + 1);
  const [firstHours, ...otherHours] = hours;

  const handleReviews = () => {
    navigate(`/review/${place.id}`, { state: { businessDetails: place } });
  };

  const handleShowOnMap = () => {
    if (window.location.pathname !== '/') {
      navigate('/', { state: { selectedPlaceId: place.id } });
      return;
    }
    const lat = place.position?.lat ?? place.location?.lat;
    const lng = place.position?.lng ?? place.location?.lng;
    if (lat !== undefined && lng !== undefined) {
      window.dispatchEvent(new CustomEvent('centerMap', { detail: { lat, lng, zoom: 17 } }));
    }
    onClose();
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Body scrolls; the action row below stays put */}
      <div className="min-h-0 flex-1 overflow-y-auto pb-4">
        {/* Photo, edge to edge, with Close and Save floated over it */}
        <div className="relative mt-2">
          {images.length > 0 ? (
            <div className="overflow-hidden bg-muted" data-vaul-no-drag>
              <SwipeableImageGallery
                images={images}
                name={place.name}
                isBookmarked={isBookmarked}
                onBookmarkToggle={handleBookmarkToggle}
                onShare={handleShare}
                placeId={place.id}
                previewMode={true}
                imageClassName="h-[248px]"
                className="rounded-none"
                counterPosition="bottom-right"
              />
            </div>
          ) : (
            <div className="flex h-[248px] items-center justify-center bg-muted" role="img" aria-label="No photos yet">
              <ImageIcon className="h-10 w-10 text-muted-foreground" aria-hidden="true" />
            </div>
          )}
          <DrawerClose asChild>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Close"
              className={`absolute left-3 top-3 z-20 ${floatingButton} [&_svg]:size-[22px] sm:[&_svg]:size-[22px]`}
            >
              <X />
            </Button>
          </DrawerClose>
          <BookmarkButton
            isBookmarked={isBookmarked}
            onToggle={handleBookmarkToggle}
            isLoading={isLoading}
            onPhoto
            className={`absolute right-3 top-3 z-20 ${floatingButton}`}
          />
        </div>

        <div className="flex flex-col gap-4 px-4 pt-3">
          {/* Title block */}
          <div className="flex flex-col gap-1">
            <DrawerTitle className="text-2xl leading-[30px] font-bold tracking-normal text-foreground break-words">
              {place.isVerified ? (
                <>
                  {nameHead}
                  {/* Keep the check attached to the last word so it never wraps on its own */}
                  <span className="whitespace-nowrap">
                    {nameLast}
                    <CircleCheck className="ml-1 inline-block h-5 w-5 align-[-2px] text-primary" aria-hidden="true" />
                  </span>
                  <span className="sr-only"> (Verified)</span>
                </>
              ) : (
                place.name
              )}
            </DrawerTitle>
            {summary && <p className="text-sm text-muted-foreground">{summary}</p>}
            <DrawerDescription className="sr-only">
              {[category, address].filter(Boolean).join(' · ') || place.name}
            </DrawerDescription>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <PlaceRating rating={place.rating} totalReviews={place.totalReviews} onClick={handleReviews} />
              {place.isCertified && <CategoryBadge category="Certified" tone="navy" icon={Shield} />}
              {place.verificationStatus === 'pending' && (
                <CategoryBadge category="Pending verification" tone="outline" />
              )}
            </div>
          </div>

          {/* Description */}
          {description && (
            <ExpandableDescription text={description} expandable className="leading-5 whitespace-pre-line" />
          )}

          {/* Info list */}
          {(address || firstHours || place.phone || place.email) && (
            <div className="border-t border-border">
              {firstHours && (
                <InfoRow icon={Clock}>
                  <p className="leading-5">{firstHours.days} {hoursText(firstHours.hours)}</p>
                  {otherHours.length > 0 && (
                    <p className="leading-5 text-muted-foreground">
                      {otherHours.map((g) => `${g.days} ${hoursText(g.hours)}`).join(' · ')}
                    </p>
                  )}
                </InfoRow>
              )}
              {address && (
                <InfoRow icon={MapPin}>
                  <div className="flex items-center gap-3">
                    <span className="min-w-0 flex-1 leading-5">{address}</span>
                    <button
                      type="button"
                      onClick={handleShowOnMap}
                      className="-my-2 inline-flex min-h-11 shrink-0 items-center text-sm font-semibold text-primary"
                    >
                      Show on map
                    </button>
                  </div>
                </InfoRow>
              )}
              {place.phone && (
                <InfoRow icon={Phone}>
                  <a href={`tel:${place.phone}`} className="leading-5 text-primary break-all">{place.phone}</a>
                </InfoRow>
              )}
              {place.email && (
                <InfoRow icon={Mail}>
                  <a href={`mailto:${place.email}`} className="leading-5 text-primary break-all">{place.email}</a>
                </InfoRow>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Actions, fixed below the scrolling body */}
      <div className="shrink-0 border-t border-border bg-card px-4 pt-3 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        <PlaceCardButtonRow
          place={place}
          secondaryAction={
            <Button
              type="button"
              variant="outline"
              onClick={handleReviews}
              className="h-11 sm:h-11 rounded-md bg-transparent px-4 text-sm font-semibold [&_svg]:size-[18px] sm:[&_svg]:size-[18px]"
            >
              <Star />
              Reviews
            </Button>
          }
        />
      </div>
    </div>
  );
};

export default PlaceOverlay;
