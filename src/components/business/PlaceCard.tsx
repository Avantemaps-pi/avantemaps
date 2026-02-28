import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';
import { Place } from '@/types/business';
import CategoryBadge from '@/components/business/CategoryBadge';
import ExpandableDescription from './ExpandableDescription';
import { useIsMobile } from '@/hooks/use-mobile';
import PlaceCardImage from './PlaceCardImage';
import PlaceCardTitle from './PlaceCardTitle';
import PlaceCardAddress from './PlaceCardAddress';
import PlaceCardRating from './PlaceCardRating';
import PlaceCardWebsiteButton from './PlaceCardWebsiteButton';
import PlaceCardDetails from './PlaceCardDetails';
import { useBookmark } from '@/hooks/useBookmark';
import { useSharePlace } from '@/hooks/useSharePlace';
import SwipeableImageGallery from './SwipeableImageGallery';
import BookmarkButton from '@/components/map/buttons/BookmarkButton';

interface PlaceCardProps {
  place: Place;
  onPlaceClick: (placeId: string, zoomToLocation?: boolean) => void;
  onRemove?: (placeId: string) => void;
  className?: string;
  showDetails?: boolean;
  isBookmarked?: boolean;
  previewMode?: boolean;
  singleImageOnly?: boolean;
  hideGalleryIndicators?: boolean;
}

const PlaceCard: React.FC<PlaceCardProps> = ({ 
  place, 
  onPlaceClick, 
  onRemove, 
  className,
  showDetails = false,
  isBookmarked: initialIsBookmarked = false,
  previewMode = false,
  singleImageOnly = false,
  hideGalleryIndicators = false
}) => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  
  // Use our custom hooks
  const { isBookmarked, handleBookmarkToggle } = useBookmark({
    initialIsBookmarked,
    onRemove,
    id: place.id
  });
  
  const { handleShare } = useSharePlace(place.name, place.id);
  
  const handleRatingClick = () => {
    navigate(`/review/${place.id}`, { 
      state: { 
        businessDetails: place
      }
    });
  };

  const handlePlaceClick = () => {
    if (window.location.pathname === '/') {
      onPlaceClick(place.id);
    } else {
      navigate('/', { state: { selectedPlaceId: place.id } });
    }
  };

  const handleAddressClick = () => {
    if (window.location.pathname === '/') {
      onPlaceClick(place.id, true);
    } else {
      navigate('/', { state: { selectedPlaceId: place.id, zoomToLocation: true } });
    }
  };
  
  // Check if we're on the recommendations page
  const isRecommendationsPage = window.location.pathname === '/recommendations';

  // Parse categories and limit to 2
  const categories = place.category.split(',')
    .map(cat => cat.trim())
    .filter(Boolean)
    .slice(0, 2); // Limit to 2 categories

  // Use images array if available, otherwise fall back to single image
  // If singleImageOnly, only use the first image
  const allImages = place.images && place.images.length > 0 
    ? place.images 
    : (place.image ? [place.image] : []);
  const images = singleImageOnly ? allImages.slice(0, 1) : allImages;

  return (
    <Card 
      key={place.id} 
      className={`material-card ${previewMode ? '' : 'card-hover'} w-full ${className || ''} place-card-container ${previewMode ? 'pointer-events-none select-none' : ''}`}
    >
      {/* Title + Bookmark above image (matching homepage popup) */}
      <CardHeader className="pb-2 px-3 pt-3">
        <div className="flex items-start justify-between">
          <PlaceCardTitle 
            name={place.name} 
            onClick={previewMode ? undefined : handlePlaceClick} 
            isVerified={place.isVerified} 
            isCertified={place.isCertified}
            verificationStatus={place.verificationStatus}
          />
          <BookmarkButton 
            isBookmarked={isBookmarked} 
            onToggle={handleBookmarkToggle}
          />
        </div>
      </CardHeader>

      {/* Image gallery without overlay actions */}
      <SwipeableImageGallery
        images={images}
        name={place.name}
        isBookmarked={isBookmarked}
        onBookmarkToggle={handleBookmarkToggle}
        onShare={handleShare}
        placeId={place.id}
        onClick={previewMode || singleImageOnly ? undefined : handlePlaceClick}
        previewMode={true}
        hideIndicators={hideGalleryIndicators}
      />
      
      <CardContent className="pt-2 px-3 pb-3">
        <PlaceCardAddress address={place.address} onClick={previewMode ? undefined : handleAddressClick} />

        <div className="relative max-h-16 mb-2 overflow-hidden">
          <ExpandableDescription text={place.description} maxLines={3} />
          <div className="absolute inset-x-0 bottom-0 h-6 bg-gradient-to-t from-card to-transparent pointer-events-none" />
        </div>

        <div className="flex flex-wrap justify-between items-start gap-2">
          <div className="flex flex-col items-start gap-2">
            <PlaceCardRating rating={place.rating} onClick={previewMode ? undefined : handleRatingClick} />
            
            {/* Display up to 2 categories vertically */}
            <div className="flex flex-col gap-1.5">
              {categories.map((category, index) => (
                <CategoryBadge key={index} category={category} />
              ))}
            </div>
          </div>
          
          <div className="flex flex-col gap-2 items-end">
            <PlaceCardWebsiteButton url={place.website} disabled={previewMode} />
            
            <PlaceCardDetails 
              place={place} 
              showDetails={showDetails} 
              isRecommendationsPage={isRecommendationsPage} 
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default PlaceCard;
