
import React from 'react';
import PlaceCardImageCarousel from './PlaceCardImageCarousel';

interface PlaceCardImageProps {
  image: string | string[];
  name: string;
  onClick: () => void;
  children?: React.ReactNode;
}

const PlaceCardImage: React.FC<PlaceCardImageProps> = ({ 
  image, 
  name, 
  onClick,
  children 
}) => {
  // Convert single image to array for consistency
  const images = Array.isArray(image) ? image : [image];
  
  return (
    <PlaceCardImageCarousel 
      images={images}
      name={name}
      onClick={onClick}
    >
      {children}
    </PlaceCardImageCarousel>
  );
};

export default PlaceCardImage;
