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
import { formatHours } from '@/components/business/formatHours';
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
      snapPoints={[0.45, 1]}
      activeSnapPoint={1}
      modal={true}
      dismissible={true}
      fadeFromIndex={0}
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

const InfoRow: React.FC<{ icon: React.ElementType; children: React.ReactNode }> = ({ icon: Icon, children }) => (
  <div className="flex items-start gap-3 border-b border-border py-3">
    <span className="shrink-0 pt-0.5 text-muted-foreground">
      <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
    </span>
    <div className="min-w-0 flex-1 text-sm text-foreground">{children}</div>
  </div>
);

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
  const [firstHours, ...otherHours] = hours;

  const handleReviews = () => {
    navigate(`/review/${place.id}`, { state: { businessDetails: place } });
  };

  const handleShowOnMap = () => {
    if (window.location.pathname !== '/') {
      navigate('/', { state: { selectedPlaceId: place.id } });
      return;
    }
    // LeafletMap's zoomToPlace listener re-opens the drawer; onClose in the same
    // click is batched after it, so the drawer ends up closed.
    window.dispatchEvent(new CustomEvent('zoomToPlace', { detail: { placeId: place.id, zoom: true } }));
    onClose();
  };

  return (
    <div className="flex min-h-0 flex-col gap-4 overflow-y-auto px-4 pt-2 pb-6">
      {/* Header */}
      <div className="flex items-start gap-1">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <DrawerTitle className="text-xl leading-7 font-semibold tracking-normal text-foreground break-words">
            {place.name}
            {place.isVerified && (
              <>
                <CircleCheck className="ml-1 inline-block h-5 w-5 align-[-3px] text-primary" aria-hidden="true" />
                <span className="sr-only"> (Verified)</span>
              </>
            )}
          </DrawerTitle>
          <DrawerDescription className="sr-only">
            {[category, address].filter(Boolean).join(' · ') || place.name}
          </DrawerDescription>
          <div className="flex flex-wrap items-center gap-2">
            <PlaceRating rating={place.rating} totalReviews={place.totalReviews} onClick={handleReviews} />
            {category && (
              <>
                <span className="text-border" aria-hidden="true">|</span>
                <CategoryBadge category={category} />
              </>
            )}
            {place.isCertified && <CategoryBadge category="Certified" tone="navy" icon={Shield} />}
            {place.verificationStatus === 'pending' && (
              <CategoryBadge category="Pending verification" tone="outline" />
            )}
          </div>
        </div>
        <div className="-mr-2.5 -mt-2 flex shrink-0 items-center">
          <BookmarkButton
            isBookmarked={isBookmarked}
            onToggle={handleBookmarkToggle}
            isLoading={isLoading}
          />
          <DrawerClose asChild>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Close"
              className="h-11 w-11 sm:h-11 sm:w-11 rounded-full text-muted-foreground [&_svg]:size-[22px] sm:[&_svg]:size-[22px]"
            >
              <X />
            </Button>
          </DrawerClose>
        </div>
      </div>

      {/* Gallery */}
      {images.length > 0 ? (
        <div className="overflow-hidden rounded-xl bg-muted" data-vaul-no-drag>
          <SwipeableImageGallery
            images={images}
            name={place.name}
            isBookmarked={isBookmarked}
            onBookmarkToggle={handleBookmarkToggle}
            onShare={handleShare}
            placeId={place.id}
            previewMode={true}
            imageClassName="h-[193px]"
          />
        </div>
      ) : (
        <div className="flex h-[193px] items-center justify-center rounded-xl bg-muted" role="img" aria-label="No photos yet">
          <ImageIcon className="h-10 w-10 text-muted-foreground" aria-hidden="true" />
        </div>
      )}

      {/* Actions */}
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

      {/* Info list */}
      {(address || firstHours || place.phone || place.email) && (
        <div className="border-t border-border">
          {address && (
            <InfoRow icon={MapPin}>
              <div className="flex items-start gap-3">
                <span className="min-w-0 flex-1 leading-5">{address}</span>
                <button
                  type="button"
                  onClick={handleShowOnMap}
                  className="-my-3 inline-flex min-h-11 shrink-0 items-center text-sm font-semibold text-primary"
                >
                  Show on map
                </button>
              </div>
            </InfoRow>
          )}
          {firstHours && (
            <InfoRow icon={Clock}>
              <p className="leading-5">{firstHours.days} {firstHours.hours}</p>
              {otherHours.length > 0 && (
                <p className="leading-5 text-muted-foreground">
                  {otherHours.map((g) => `${g.days} ${g.hours}`).join(' · ')}
                </p>
              )}
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

      {/* About */}
      {description && (
        <section className="flex flex-col gap-1">
          <h3 className="text-[17px] leading-6 font-semibold text-foreground">About</h3>
          <ExpandableDescription text={description} className="leading-5 whitespace-pre-line" />
        </section>
      )}
    </div>
  );
};

export default PlaceOverlay;
