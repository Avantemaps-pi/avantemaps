import React, { forwardRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CircleCheck, Info, Shield } from 'lucide-react';
import CategoryBadge from '@/components/business/CategoryBadge';
import { useNavigate } from 'react-router-dom';
import { Place } from '@/types/business';
import ExpandableDescription from '@/components/business/ExpandableDescription';
import BookmarkButton from './buttons/BookmarkButton';
import WebsiteButton from './buttons/WebsiteButton';
import PlaceRating from './place/PlaceRating';
import PlaceAddress from './place/PlaceAddress';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import DetailsCard from '@/components/business/DetailsCard';
import SwipeableImageGallery from '@/components/business/SwipeableImageGallery';
import { useSharePlace } from '@/hooks/useSharePlace';
import { useBookmark } from '@/hooks/useBookmark';

interface PlaceCardPopupProps {
  location: Place;
  detailCardRef?: React.RefObject<HTMLDivElement>;
}

const PlaceCardPopup = forwardRef<HTMLDivElement, PlaceCardPopupProps>(({ 
  location,
  detailCardRef
}, ref) => {
  const navigate = useNavigate();
  const { isBookmarked, handleBookmarkToggle, isLoading } = useBookmark({
    initialIsBookmarked: false,
    id: location.id
  });
  const { handleShare } = useSharePlace(location.name, location.id);
  
  // Use images array if available, otherwise fall back to single image
  const images = location.images && location.images.length > 0 
    ? location.images 
    : (location.image ? [location.image] : []);
  
  const handleRatingClick = () => {
    navigate(`/review/${location.id}`, { 
      state: { 
        businessDetails: location
      }
    });
  };

  const handlePlaceClick = () => {
    if (window.location.pathname === '/') {
    } else {
      navigate('/', { state: { selectedPlaceId: location.id } });
    }
  };

  return (
    <Card className="w-[300px] shadow-md border-gray-200 place-popup z-[100]" ref={ref}>
      <CardHeader className="pb-2 px-3 pt-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            {location.isCertified && (
              <div className="flex-shrink-0">
                <Shield className="h-5 w-5 text-blue-500" />
              </div>
            )}
            {location.isVerified && (
              <div className="flex-shrink-0">
                <CircleCheck className="h-5 w-5 text-green-500" />
              </div>
            )}
            <CardTitle 
              className="text-base font-bold cursor-pointer hover:text-blue-500 transition-colors"
              onClick={handlePlaceClick}
            >
              {location.name}
            </CardTitle>
          </div>
          <BookmarkButton 
            isBookmarked={isBookmarked} 
            onToggle={handleBookmarkToggle}
            isLoading={isLoading}
          />
        </div>
      </CardHeader>
      
      <SwipeableImageGallery
        images={images}
        name={location.name}
        isBookmarked={isBookmarked}
        onBookmarkToggle={handleBookmarkToggle}
        onShare={handleShare}
        placeId={location.id}
        onClick={handlePlaceClick}
        previewMode={true}
      />
      
      <CardContent className="pt-3 px-3 space-y-3">
        <PlaceAddress
          address={location.address}
          onClick={handlePlaceClick}
        />

        <div className="relative h-20 overflow-hidden">
          <ExpandableDescription text={location.description} maxLines={4} />
          <div className="absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-card to-transparent pointer-events-none" />
        </div>

        <div className="flex justify-between items-start gap-2">
          <div className="flex flex-col items-start gap-2">
            <PlaceRating
              rating={location.rating}
              onClick={handleRatingClick}
            />
            <CategoryBadge category={location.category} />
          </div>

          <div className="flex flex-col gap-2 items-end flex-shrink-0">
            <WebsiteButton url={location.website} />

            <Popover>
              <PopoverTrigger asChild>
                <div className="text-blue-500 font-medium text-sm cursor-pointer flex items-center whitespace-nowrap">
                  <Info className="h-3 w-3 mr-1" />
                  Details
                </div>
              </PopoverTrigger>
              <PopoverContent className="p-0 w-[480px]" align="end">
                <DetailsCard place={location} />
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

PlaceCardPopup.displayName = "PlaceCardPopup";

export default PlaceCardPopup;
