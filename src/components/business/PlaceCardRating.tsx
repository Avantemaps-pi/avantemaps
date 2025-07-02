
import React from 'react';
import { Star } from 'lucide-react';

interface PlaceCardRatingProps {
  rating: number;
  onClick: () => void;
}

const PlaceCardRating: React.FC<PlaceCardRatingProps> = ({ rating, onClick }) => {
  return (
    <div 
      className="inline-flex items-center px-2 py-1 rounded bg-yellow-100 cursor-pointer"
      onClick={onClick}
    >
      <Star className="h-3.5 w-3.5 text-yellow-600 fill-yellow-600 mr-1" />
      <span className="text-xs font-medium text-yellow-800">{rating.toFixed(1)}</span>
    </div>
  );
};

export default PlaceCardRating;
