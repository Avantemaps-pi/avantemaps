
import React from 'react';
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

  return (
    <Card 
      key={place.id} 
      className={`material-card card-hover ${className || 'w-full'} place-card-container`}
    >
      <PlaceCardImage 
        image={place.image} 
        name={place.name} 
        onClick={handlePlaceClick}
      >
        <PlaceCardActions 
          isBookmarked={isBookmarked} 
          onBookmarkToggle={handleBookmarkToggle} 
          onShare={handleShare} 
        />
      </PlaceCardImage>
      
      <CardHeader className="pb-0 px-3 pt-3">
        <PlaceCardTitle name={place.name} onClick={handlePlaceClick} />
      </CardHeader>
      
      <CardContent className="pt-2 px-3 pb-3">
        <PlaceCardAddress address={place.address} onClick={handlePlaceClick} />
        
        <div className="h-20 mb-2 overflow-hidden">
          <ExpandableDescription text={place.description} maxLines={3} />
        </div>
        
        <div className="flex flex-wrap justify-between items-start mt-auto gap-2">
          <div className="flex flex-col items-start gap-2">
            <PlaceCardRating rating={place.rating} onClick={handleRatingClick} />
            
            {/* Display up to 2 categories vertically */}
            <div className="flex flex-col gap-1.5">
              {categories.map((category, index) => (
                <CategoryBadge key={index} category={category} />
              ))}
            </div>
          </div>
          
          <div className="flex flex-col gap-2 items-end">
            <PlaceCardWebsiteButton url={place.website} />
            
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
