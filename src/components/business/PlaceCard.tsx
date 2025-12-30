import React, { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Shield } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Place } from '@/types/business';
import CategoryBadge from '@/components/business/CategoryBadge';
import ExpandableDescription from './ExpandableDescription';
import { useIsMobile } from '@/hooks/use-mobile';
import PlaceCardActions from './PlaceCardActions';
import PlaceCardImage from './PlaceCardImage';
import PlaceCardTitle from './PlaceCardTitle';
import PlaceCardAddress from './PlaceCardAddress';
import PlaceCardRating from './PlaceCardRating';
import PlaceCardWebsiteButton from './PlaceCardWebsiteButton';
import PlaceCardDetails from './PlaceCardDetails';
import { useBookmark } from '@/hooks/useBookmark';
import { useSharePlace } from '@/hooks/useSharePlace';
import ImageCarousel from './ImageCarousel';

interface PlaceCardProps {
  place: Place;
  onPlaceClick: (placeId: string, zoomToLocation?: boolean) => void;
  onRemove?: (placeId: string) => void;
  className?: string;
  showDetails?: boolean;
  isBookmarked?: boolean;
  previewMode?: boolean;
}

const PlaceCard: React.FC<PlaceCardProps> = ({ 
  place, 
  onPlaceClick, 
  onRemove, 
  className,
  showDetails = false,
  isBookmarked: initialIsBookmarked = false,
  previewMode = false
}) => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  
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
  const images = place.images && place.images.length > 0 
    ? place.images 
    : (place.image ? [place.image] : []);

  return (
    <Card 
      key={place.id} 
      className={`material-card ${previewMode ? '' : 'card-hover'} ${className || 'w-full'} place-card-container ${previewMode ? 'pointer-events-none select-none' : ''}`}
    >
      {images.length > 0 ? (
        <div className="relative">
          <PlaceCardImage 
            image={images[currentImageIndex]} 
            name={place.name} 
            onClick={previewMode ? undefined : handlePlaceClick}
          >
            {!previewMode && (
              <PlaceCardActions 
                isBookmarked={isBookmarked} 
                onBookmarkToggle={handleBookmarkToggle} 
                onShare={handleShare} 
                placeName={place.name}
                placeId={place.id}
              />
            )}
          </PlaceCardImage>
          
          {/* Image position indicator lines */}
          {images.length > 1 && (
            <div className="absolute bottom-0 left-0 right-0 flex gap-1 px-2 pb-2">
              {images.map((_, index) => (
                <button
                  key={index}
                  onClick={(e) => {
                    e.stopPropagation();
                    setCurrentImageIndex(index);
                  }}
                  className={`h-0.5 flex-1 rounded-full transition-all duration-200 ${
                    index === currentImageIndex 
                      ? 'bg-white' 
                      : 'bg-white/40 hover:bg-white/60'
                  }`}
                  aria-label={`View image ${index + 1} of ${images.length}`}
                />
              ))}
            </div>
          )}
          
          {images.length > 1 && !previewMode && (
            <ImageCarousel 
              images={images}
              currentIndex={currentImageIndex}
              onImageChange={setCurrentImageIndex}
            />
          )}
        </div>
      ) : (
        <PlaceCardImage 
          image={place.image} 
          name={place.name} 
          onClick={previewMode ? undefined : handlePlaceClick}
        >
          {!previewMode && (
            <PlaceCardActions 
              isBookmarked={isBookmarked} 
              onBookmarkToggle={handleBookmarkToggle} 
              onShare={handleShare} 
              placeName={place.name}
              placeId={place.id}
            />
          )}
        </PlaceCardImage>
      )}
      
      <CardHeader className="pb-0 px-3 pt-3">
        <div className="flex items-start gap-2">
          {place.isCertified && (
            <div className="flex-shrink-0">
              <Shield className="h-5 w-5 text-blue-500" />
            </div>
          )}
          <div className="flex-1">
            <PlaceCardTitle name={place.name} onClick={previewMode ? undefined : handlePlaceClick} isVerified={place.isVerified} />
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-2 px-3 pb-3">
        <PlaceCardAddress address={place.address} onClick={previewMode ? undefined : handleAddressClick} />

        <div className="relative h-20 mb-3 overflow-hidden">
          <ExpandableDescription text={place.description} maxLines={4} />
          <div className="absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-card to-transparent pointer-events-none" />
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
            
            <div className={previewMode ? 'pointer-events-auto' : ''}>
              <PlaceCardDetails 
                place={place} 
                showDetails={showDetails} 
                isRecommendationsPage={isRecommendationsPage} 
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default PlaceCard;
