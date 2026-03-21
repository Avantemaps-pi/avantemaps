import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Place } from '@/types/business';
import { CircleCheck, Info, Shield } from 'lucide-react';
import { Drawer, DrawerContent } from '@/components/ui/drawer';
import CategoryBadge from '@/components/business/CategoryBadge';
import ExpandableDescription from '@/components/business/ExpandableDescription';
import BookmarkButton from '../buttons/BookmarkButton';
import WebsiteButton from '../buttons/WebsiteButton';
import PlaceRating from '../place/PlaceRating';
import PlaceAddress from '../place/PlaceAddress';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import DetailsCard from '@/components/business/DetailsCard';
import SwipeableImageGallery from '@/components/business/SwipeableImageGallery';
import { useSharePlace } from '@/hooks/useSharePlace';
import { useBookmark } from '@/hooks/useBookmark';

interface PlaceOverlayProps {
  selectedPlace: Place | null;
  showPopover: boolean;
  onOverlayClick: () => void;
  detailCardRef?: React.RefObject<HTMLDivElement>;
}

const PlaceOverlay: React.FC<PlaceOverlayProps> = ({ 
  selectedPlace, 
  showPopover, 
  onOverlayClick,
  detailCardRef 
}) => {
  const navigate = useNavigate();

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
      <DrawerContent className="z-50 max-h-[96vh] focus:outline-none">
        <PlaceOverlayContent 
          place={selectedPlace} 
          detailCardRef={detailCardRef} 
        />
      </DrawerContent>
    </Drawer>
  );
};

const PlaceOverlayContent: React.FC<{ place: Place; detailCardRef?: React.RefObject<HTMLDivElement> }> = ({ place, detailCardRef }) => {
  const navigate = useNavigate();
  const { isBookmarked, handleBookmarkToggle, isLoading } = useBookmark({
    initialIsBookmarked: false,
    id: place.id
  });
  const { handleShare } = useSharePlace(place.name, place.id);

  const images = place.images && place.images.length > 0 
    ? place.images 
    : (place.image ? [place.image] : []);

  const handleRatingClick = () => {
    navigate(`/review/${place.id}`, { state: { businessDetails: place } });
  };

  const handlePlaceClick = () => {
    if (window.location.pathname !== '/') {
      navigate('/', { state: { selectedPlaceId: place.id } });
    }
  };

  return (
    <div className="overflow-y-auto px-4 pb-6 space-y-3">
      {/* Title row */}
      <div className="flex items-start justify-between pt-2">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {place.isCertified && <Shield className="h-5 w-5 text-primary flex-shrink-0" />}
          {place.isVerified && <CircleCheck className="h-5 w-5 text-accent-foreground flex-shrink-0" />}
          <h3 
            className="text-base font-bold truncate cursor-pointer hover:text-primary transition-colors"
            onClick={handlePlaceClick}
          >
            {place.name}
          </h3>
        </div>
        <BookmarkButton 
          isBookmarked={isBookmarked} 
          onToggle={handleBookmarkToggle}
          isLoading={isLoading}
        />
      </div>

      {/* Image gallery */}
      <SwipeableImageGallery
        images={images}
        name={place.name}
        isBookmarked={isBookmarked}
        onBookmarkToggle={handleBookmarkToggle}
        onShare={handleShare}
        placeId={place.id}
        onClick={handlePlaceClick}
        previewMode={true}
      />

      {/* Address */}
      <PlaceAddress address={place.address} onClick={handlePlaceClick} />

      {/* Description with fade */}
      <div className="relative h-20 overflow-hidden">
        <ExpandableDescription text={place.description} maxLines={4} />
        <div className="absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-background to-transparent pointer-events-none" />
      </div>

      {/* Rating, category, website, details */}
      <div className="flex justify-between items-start gap-2">
        <div className="flex flex-col items-start gap-2">
          <PlaceRating rating={place.rating} onClick={handleRatingClick} />
          <CategoryBadge category={place.category} />
        </div>

        <div className="flex flex-col gap-2 items-end flex-shrink-0">
          <WebsiteButton url={place.website} />
          <Popover>
            <PopoverTrigger asChild>
              <div className="text-primary font-medium text-sm cursor-pointer flex items-center whitespace-nowrap">
                <Info className="h-3 w-3 mr-1" />
                Details
              </div>
            </PopoverTrigger>
            <PopoverContent className="p-0 w-[480px]" align="end">
              <DetailsCard place={place} />
            </PopoverContent>
          </Popover>
        </div>
      </div>
    </div>
  );
};

export default PlaceOverlay;
