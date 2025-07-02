
import React from 'react';
import { Info } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import DetailsCard from './DetailsCard';
import { Place } from '@/data/mockPlaces';

interface PlaceCardDetailsProps {
  place: Place;
  showDetails: boolean;
  isRecommendationsPage: boolean;
}

const PlaceCardDetails: React.FC<PlaceCardDetailsProps> = ({ 
  place, 
  showDetails, 
  isRecommendationsPage 
}) => {
  if (!showDetails || isRecommendationsPage) {
    return null;
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <div className="text-blue-500 font-medium text-sm cursor-pointer flex items-center whitespace-nowrap hover:text-blue-600 transition-colors">
          <Info className="h-4 w-4 mr-1" />
          Details
        </div>
      </PopoverTrigger>
      <PopoverContent className="p-0 w-[300px] sm:w-[420px]" align="end">
        <DetailsCard place={place} />
      </PopoverContent>
    </Popover>
  );
};

export default PlaceCardDetails;
