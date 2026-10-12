
import React from 'react';
import RatingPill from '@/components/business/RatingPill';

interface PlaceRatingProps {
  rating: number;
  totalReviews?: number | undefined;
  onClick: () => void;
}

const PlaceRating: React.FC<PlaceRatingProps> = ({ rating, totalReviews, onClick }) => {
  return <RatingPill rating={rating} totalReviews={totalReviews} onClick={onClick} />;
};

export default PlaceRating;
