
import React from 'react';
import ProgressiveImage from './ProgressiveImage';

interface PlaceCardImageProps {
  image: string;
  name: string;
  onClick?: (e: React.MouseEvent<HTMLDivElement>) => void;
  children?: React.ReactNode;
  className?: string;
}

const PlaceCardImage: React.FC<PlaceCardImageProps> = ({ 
  image, 
  name, 
  onClick,
  children,
  className
}) => {
  return (
    <div 
      className={`overflow-hidden cursor-pointer relative ${className || 'aspect-video'}`}
      onClick={onClick}
    >
      <ProgressiveImage
        src={image}
        alt={name}
        className="w-full h-full object-cover hover:opacity-90 transition-opacity"
        onError={(e) => {
          e.currentTarget.src = '/placeholder.svg';
          e.currentTarget.alt = 'Business Image';
        }}
      />
      {children}
    </div>
  );
};

export default PlaceCardImage;
