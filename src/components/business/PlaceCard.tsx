
import React, { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';
import { Place } from '@/data/mockPlaces';
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
  onPlaceClick: (placeId: string) => void;
  onRemove?: (placeId: string) => void;
  className?: string;
  showDetails?: boolean;
  isBookmarked?: boolean;
}

const PlaceCard: React.FC<PlaceCardProps> = ({ 
  place, 
  onPlaceClick, 
  onRemove, 
  className,
  showDetails = false,
  isBookmarked: initialIsBookmarked = false
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
  
  // Check if we're on the recommendations page
  const isRecommendationsPage = window.location.pathname === '/recommendations';

  // Parse categories and limit to 2
  const categories = place.category.split(',')
    .map(cat => cat.trim())
    .filter(Boolean)
    .slice(0, 2); // Limit to 2 categories

  // Create an array of images (for now using single image, but ready for multiple)
  const images = place.image ? [place.image] : [];

  // Use larger layout for recommendations page
  const cardHeight = isRecommendationsPage ? "h-[400px]" : "h-auto";
  const imageHeight = isRecommendationsPage ? "h-48" : "h-40";

  return (
    <Card 
      key={place.id} 
      className={`material-card card-hover ${className || 'w-full'} place-card-container ${cardHeight} flex flex-col`}
    >
      {images.length > 0 ? (
        <div className="relative">
          <div 
            className={`${imageHeight} overflow-hidden cursor-pointer relative`}
            onClick={handlePlaceClick}
          >
            <img 
              src={images[currentImageIndex]} 
              alt={place.name} 
              className="w-full h-full object-cover hover:opacity-90 transition-opacity"
              onError={(e) => {
                e.currentTarget.src = 'public/placeholder.svg';
                e.currentTarget.alt = 'Business Image';
              }}
            />
            <PlaceCardActions 
              isBookmarked={isBookmarked} 
              onBookmarkToggle={handleBookmarkToggle} 
              onShare={handleShare} 
            />
          </div>
          
          {images.length > 1 && (
            <ImageCarousel 
              images={images}
              currentIndex={currentImageIndex}
              onImageChange={setCurrentImageIndex}
            />
          )}
        </div>
      ) : (
        <div 
          className={`${imageHeight} overflow-hidden cursor-pointer relative bg-gray-200 flex items-center justify-center`}
          onClick={handlePlaceClick}
        >
          <span className="text-gray-500">No Image</span>
          <PlaceCardActions 
            isBookmarked={isBookmarked} 
            onBookmarkToggle={handleBookmarkToggle} 
            onShare={handleShare} 
          />
        </div>
      )}
      
      <div className="flex flex-col flex-1">
        <CardHeader className="pb-0 px-4 pt-4">
          <PlaceCardTitle name={place.name} onClick={handlePlaceClick} />
        </CardHeader>
        
        <CardContent className="pt-2 px-4 pb-4 flex flex-col flex-1">
          <PlaceCardAddress address={place.address} onClick={handlePlaceClick} />
          
          <div className={`${isRecommendationsPage ? 'h-16' : 'h-20'} mb-3 overflow-hidden flex-1`}>
            <ExpandableDescription text={place.description} maxLines={isRecommendationsPage ? 2 : 3} />
          </div>
          
          <div className="flex flex-wrap justify-between items-end mt-auto gap-3">
            <div className="flex flex-col items-start gap-2">
              <PlaceCardRating rating={place.rating} onClick={handleRatingClick} />
              
              {/* Display up to 2 categories */}
              <div className="flex flex-wrap gap-1">
                {categories.map((category, index) => (
                  <CategoryBadge key={index} category={category} />
                ))}
              </div>
            </div>
            
            <div className="flex flex-col gap-2 items-end">
              {isRecommendationsPage ? (
                <button 
                  onClick={handlePlaceClick}
                  className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  View Details
                </button>
              ) : (
                <>
                  <PlaceCardWebsiteButton url={place.website} />
                  <PlaceCardDetails 
                    place={place} 
                    showDetails={showDetails} 
                    isRecommendationsPage={isRecommendationsPage} 
                  />
                </>
              )}
            </div>
          </div>
        </CardContent>
      </div>
    </Card>
  );
};

export default PlaceCard;
