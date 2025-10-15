
import React, { forwardRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CircleCheck, Info } from 'lucide-react';
import CategoryBadge from '@/components/business/CategoryBadge';
import { useNavigate } from 'react-router-dom';
import { Place } from '@/data/mockPlaces';
import ExpandableDescription from '@/components/business/ExpandableDescription';
import BookmarkButton from './buttons/BookmarkButton';
import WebsiteButton from './buttons/WebsiteButton';
import PlaceImage from './place/PlaceImage';
import PlaceRating from './place/PlaceRating';
import PlaceAddress from './place/PlaceAddress';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import DetailsCard from '@/components/business/DetailsCard';

interface PlaceCardPopupProps {
  location: Place;
  detailCardRef?: React.RefObject<HTMLDivElement>;
}

const PlaceCardPopup = forwardRef<HTMLDivElement, PlaceCardPopupProps>(({ 
  location,
  detailCardRef
}, ref) => {
  const navigate = useNavigate();
  const [isBookmarked, setIsBookmarked] = useState(false);
  
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
  
  const handleBookmarkToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsBookmarked(!isBookmarked);
  };

  return (
    <Card className="w-[300px] shadow-md border-gray-200 place-popup z-[100]" ref={ref}>
      <CardHeader className="pb-2 px-3 pt-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
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
          />
        </div>
      </CardHeader>
      
      <PlaceImage 
        src={location.image} 
        alt={location.name} 
        onClick={handlePlaceClick} 
      />
      
      <CardContent className="pt-3 px-3">
        <PlaceAddress 
          address={location.address} 
          onClick={handlePlaceClick} 
        />
        
        <div className="h-16 mb-2">
          <ExpandableDescription text={location.description} maxLines={4} />
        </div>
        
        <div className="flex justify-between items-start mt-4">
          <div className="flex flex-col items-start gap-2">
            <PlaceRating 
              rating={location.rating} 
              onClick={handleRatingClick} 
            />
            <CategoryBadge category={location.category} />
          </div>
          
          <div className="flex flex-col gap-2 items-end">
            <WebsiteButton url={location.website} />
            
            <Popover>
              <PopoverTrigger asChild>
                <div className="text-blue-500 font-medium text-sm cursor-pointer flex items-center">
                  <Info className="h-3 w-3 mr-1" />
                  Details
                </div>
              </PopoverTrigger>
              <PopoverContent className="p-0 w-[420px]" align="end">
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
