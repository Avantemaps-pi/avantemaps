
import React from 'react';
import { Star } from 'lucide-react';

interface PlaceCardRatingProps {
  rating: number;
  onClick: () => void;
}

const PlaceCardRating: React.FC<PlaceCardRatingProps> = ({ rating, onClick }) => {
  return (
    <div 
      className="inline-flex items-center px-2 py-1 rounded bg-amber-100 dark:bg-amber-950/40 cursor-pointer w-14 justify-center"
      onClick={onClick}
    >
      <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500 mr-1" />
      <span className="text-xs font-medium text-amber-800 dark:text-amber-400">{rating.toFixed(1)}</span>
    </div>
  );
};

export default PlaceCardRating;
