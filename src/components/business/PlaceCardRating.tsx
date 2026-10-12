
import React from 'react';
import RatingPill from './RatingPill';

interface PlaceCardRatingProps {
  rating: number;
  totalReviews?: number | undefined;
  onClick: (() => void) | undefined;
}

const PlaceCardRating: React.FC<PlaceCardRatingProps> = ({ rating, totalReviews, onClick }) => {
  return <RatingPill rating={rating} totalReviews={totalReviews} onClick={onClick} />;
};

export default PlaceCardRating;
