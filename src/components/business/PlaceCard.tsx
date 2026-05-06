import React, { useState } from 'react';
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
import DetailsCard from './DetailsCard';
import { useBookmark } from '@/hooks/useBookmark';
import { useSharePlace } from '@/hooks/useSharePlace';
import SwipeableImageGallery from './SwipeableImageGallery';
import BookmarkButton from '@/components/map/buttons/BookmarkButton';
import { Info, X } from 'lucide-react';

interface PlaceCardProps {
  place: Place;
  onPlaceClick: (placeId: string, zoomToLocation?: boolean) => void;
  onRemove?: (placeId: string) => void;
  className?: string;
  showDetails?: boolean;
  isBookmarked?: boolean;
  previewMode?: boolean;
  disableRating?: boolean;
  disableBookmark?: boolean;
  singleImageOnly?: boolean;
  hideGalleryIndicators?: boolean;
  highlightQuery?: string;
}

const PlaceCard: React.FC<PlaceCardProps> = ({ 
  place, 
  onPlaceClick, 
  onRemove, 
  className,
  showDetails = false,
  isBookmarked: initialIsBookmarked = false,
  previewMode = false,
  disableRating = false,
  disableBookmark = false,
  singleImageOnly = false,
  hideGalleryIndicators = false,
  highlightQuery,
}) => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [detailsOverlayOpen, setDetailsOverlayOpen] = useState(false);
  
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
      className={`material-card ${previewMode ? '' : 'card-hover'} w-full ${className || ''} place-card-container`}
    >
      {/* Title + Bookmark above image (matching homepage popup) */}
      <CardHeader className={`pb-2 px-3 pt-3 ${previewMode ? 'pointer-events-none select-none' : ''}`}>
        <div className="flex items-start justify-between">
          <PlaceCardTitle 
            name={place.name} 
            onClick={previewMode ? undefined : handlePlaceClick} 
            isVerified={place.isVerified} 
            isCertified={place.isCertified}
            verificationStatus={place.verificationStatus}
          />
          {!disableBookmark && (
            <BookmarkButton 
              isBookmarked={isBookmarked} 
              onToggle={handleBookmarkToggle}
            />
          )}
        </div>
      </CardHeader>

      {/* Image gallery with optional details overlay */}
      <div className="relative">
        <SwipeableImageGallery
          images={images}
          name={place.name}
          isBookmarked={isBookmarked}
          onBookmarkToggle={handleBookmarkToggle}
          onShare={handleShare}
          placeId={place.id}
          onClick={singleImageOnly ? undefined : handlePlaceClick}
          previewMode={previewMode ? false : true}
          hideIndicators={hideGalleryIndicators}
          paused={detailsOverlayOpen}
        />
        
        {/* Details overlay on top of images */}
        {detailsOverlayOpen && (
          <div className="absolute inset-0 z-20 bg-background/95 backdrop-blur-sm rounded-lg overflow-y-auto flex flex-col">
            <button
              onClick={() => setDetailsOverlayOpen(false)}
              className="absolute top-1 right-1 z-30 p-1 rounded-full bg-muted hover:bg-muted/80 transition-colors"
            >
              <X className="h-4 w-4 text-foreground" />
            </button>
            <div className="flex-1 flex items-center justify-center p-2">
              <DetailsCard place={place} className="shadow-none border-0 bg-transparent" />
            </div>
          </div>
        )}
      </div>
      
      <CardContent className="pt-3 px-3 space-y-3">
        <div className={previewMode ? 'pointer-events-none select-none' : ''}>
          <PlaceCardAddress address={place.address} onClick={previewMode ? undefined : handleAddressClick} />
        </div>

        <div className={`relative h-20 overflow-hidden ${previewMode ? 'select-none' : ''}`}>
          <ExpandableDescription text={place.description} maxLines={4} />
          <div className="absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-card to-transparent pointer-events-none" />
        </div>

        <div className="flex justify-between items-start gap-2">
          <div className={`flex flex-col items-start gap-2 ${previewMode ? 'pointer-events-none select-none' : ''}`}>
            <PlaceCardRating rating={place.rating} onClick={(previewMode || disableRating) ? undefined : handleRatingClick} />
            <CategoryBadge category={categories[0] || ''} />
          </div>
          
          <div className="flex flex-col gap-2 items-end flex-shrink-0">
            <div className={previewMode ? 'pointer-events-none select-none' : ''}>
              <PlaceCardWebsiteButton url={place.website} disabled={previewMode} />
            </div>
            
            {showDetails && (
              <div 
                className="text-primary font-medium text-sm cursor-pointer flex items-center whitespace-nowrap"
                onClick={() => setDetailsOverlayOpen(!detailsOverlayOpen)}
              >
                <Info className="h-3 w-3 mr-1" />
                Details
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default PlaceCard;
