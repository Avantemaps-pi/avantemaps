
import React from 'react';
import ProgressiveImage from '@/components/business/ProgressiveImage';

interface PlaceImageProps {
  src: string;
  alt: string;
  onClick: () => void;
}

const PlaceImage: React.FC<PlaceImageProps> = ({ src, alt, onClick }) => {
  return (
    <div 
      className="h-40 overflow-hidden px-3 cursor-pointer"
      onClick={onClick}
    >
      <div className="bg-gray-100 h-full flex items-center justify-center rounded-md">
        <ProgressiveImage
          src={src}
          alt={alt}
          className="w-full h-full object-cover rounded-md hover:opacity-90 transition-opacity"
          onError={(e) => {
            e.currentTarget.src = 'public/placeholder.svg';
            e.currentTarget.alt = 'Business Image';
          }}
        />
      </div>
    </div>
  );
};

export default PlaceImage;
