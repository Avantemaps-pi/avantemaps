
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface PlaceCardImageCarouselProps {
  images: string[];
  name: string;
  onClick: () => void;
  children?: React.ReactNode;
}

const PlaceCardImageCarousel: React.FC<PlaceCardImageCarouselProps> = ({ 
  images, 
  name, 
  onClick,
  children 
}) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  
  // If no images or only one image, don't show indicators
  const showIndicators = images && images.length > 1;
  
  const handleIndicatorClick = (index: number) => {
    setCurrentImageIndex(index);
  };

  return (
    <div className="relative">
      <div 
        className="relative h-40 w-full bg-gray-200 rounded-t-lg overflow-hidden cursor-pointer"
        onClick={onClick}
      >
        <img 
          src={images && images.length > 0 ? images[currentImageIndex] : '/placeholder.svg'} 
          alt={name}
          className="w-full h-full object-cover"
        />
        {children}
      </div>
      
      {/* Carousel Indicators */}
      {showIndicators && (
        <div className="flex justify-center gap-1 mt-2 mb-2">
          {images.map((_, index) => (
            <Button
              key={index}
              variant="ghost"
              size="sm"
              className={cn(
                "w-2 h-2 p-0 rounded-full",
                index === currentImageIndex 
                  ? "bg-primary hover:bg-primary/90" 
                  : "bg-gray-300 hover:bg-gray-400"
              )}
              onClick={(e) => {
                e.stopPropagation();
                handleIndicatorClick(index);
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default PlaceCardImageCarousel;
