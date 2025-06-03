
import React, { useState } from 'react';
import { MapPin, Clock, ExternalLink, Star } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import PlaceCardImage from './PlaceCardImage';
import ImageCarousel from './ImageCarousel';

interface PlaceCardProps {
  place: {
    id: string;
    name: string;
    image?: string;
    images?: string[];
    address: string;
    rating?: number;
    category?: string;
    hours?: string | Record<string, string>;
    website?: string;
    distance?: string;
  };
  onPlaceClick: (placeId: string) => void;
  className?: string;
  showDetails?: boolean;
  isBookmarked?: boolean;
  onRemove?: (id: string) => void;
}

const PlaceCard: React.FC<PlaceCardProps> = ({ 
  place, 
  onPlaceClick, 
  className,
  showDetails = false,
  isBookmarked = false,
  onRemove
}) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  
  // Use images array if available, otherwise fall back to single image
  const displayImages = place.images && place.images.length > 0 
    ? place.images 
    : place.image 
      ? [place.image] 
      : ['/placeholder.svg'];

  const handleImageClick = () => {
    onPlaceClick(place.id);
  };

  const handleImageChange = (index: number) => {
    setCurrentImageIndex(index);
  };

  const handleWebsiteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (place.website) {
      window.open(place.website, '_blank');
    }
  };

  // Format hours for display
  const getDisplayHours = () => {
    if (!place.hours) return undefined;
    
    if (typeof place.hours === 'string') {
      return place.hours;
    }
    
    // If hours is an object, format it nicely
    const today = new Date().toLocaleLowerCase().slice(0, 3); // get day like 'mon', 'tue', etc
    const daysMapping: Record<string, string> = {
      'mon': 'monday',
      'tue': 'tuesday', 
      'wed': 'wednesday',
      'thu': 'thursday',
      'fri': 'friday',
      'sat': 'saturday',
      'sun': 'sunday'
    };
    
    const fullDayName = daysMapping[today];
    if (fullDayName && place.hours[fullDayName]) {
      return `Today: ${place.hours[fullDayName]}`;
    }
    
    // Fallback to first available hours
    const firstDay = Object.keys(place.hours)[0];
    return firstDay ? place.hours[firstDay] : undefined;
  };

  const displayHours = getDisplayHours();

  return (
    <Card className={cn(
      "overflow-hidden hover:shadow-lg transition-shadow cursor-pointer bg-white border border-gray-200",
      className
    )}>
      <div onClick={() => onPlaceClick(place.id)}>
        {displayImages.length > 1 ? (
          <div className="relative">
            <ImageCarousel
              images={displayImages}
              currentIndex={currentImageIndex}
              onImageChange={handleImageChange}
            />
          </div>
        ) : (
          <div className="relative">
            <PlaceCardImage
              image={displayImages[0]}
              name={place.name}
              onClick={handleImageClick}
            />
            {/* Single dot indicator for single image */}
            <div className="flex justify-center gap-2 mt-2 pb-2">
              <div className="w-2 h-2 rounded-full bg-primary" />
            </div>
          </div>
        )}
        
        <CardContent className="p-4">
          <div className="space-y-3">
            <div className="flex items-start justify-between">
              <h3 className="font-semibold text-lg leading-tight text-gray-900">
                {place.name}
              </h3>
              {place.rating && (
                <div className="flex items-center text-sm text-yellow-600">
                  <Star className="w-4 h-4 mr-1 fill-current" />
                  <span className="font-medium">{place.rating}</span>
                </div>
              )}
            </div>
            
            <div className="flex items-center text-sm text-gray-600">
              <MapPin className="w-4 h-4 mr-1 flex-shrink-0" />
              <span className="truncate">{place.address}</span>
              {place.distance && (
                <span className="ml-2 text-xs text-gray-500 flex-shrink-0">
                  {place.distance}
                </span>
              )}
            </div>
            
            {displayHours && (
              <div className="flex items-center text-sm text-gray-600">
                <Clock className="w-4 h-4 mr-1 flex-shrink-0" />
                <span>{displayHours}</span>
              </div>
            )}
            
            <div className="flex items-center justify-between">
              {place.category && (
                <Badge variant="secondary" className="text-xs">
                  {place.category}
                </Badge>
              )}
              
              {place.website && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleWebsiteClick}
                  className="ml-auto"
                >
                  <ExternalLink className="w-4 h-4 mr-1" />
                  Visit
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </div>
    </Card>
  );
};

export default PlaceCard;
