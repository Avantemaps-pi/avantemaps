
import React from 'react';

interface PlaceCardImageProps {
  image: string;
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
  return (
    <div 
      className="h-40 overflow-hidden cursor-pointer relative"
      onClick={onClick}
    >
      <img 
        src={image} 
        alt={name} 
        className="w-full h-full object-cover hover:opacity-90 transition-opacity"
        onError={(e) => {
          e.currentTarget.src = 'public/placeholder.svg';
          e.currentTarget.alt = 'Business Image';
        }}
      />
      {children}
    </div>
  );
};

export default PlaceCardImage;
