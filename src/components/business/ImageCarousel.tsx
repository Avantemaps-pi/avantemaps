
import React from 'react';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ImageCarouselProps {
  images: string[];
  currentIndex: number;
  onImageChange: (index: number) => void;
}

const ImageCarousel: React.FC<ImageCarouselProps> = ({ 
  images, 
  currentIndex, 
  onImageChange 
}) => {
  return (
    <div className="w-full space-y-2">
      <Carousel className="w-full">
        <CarouselContent>
          {images.map((image, index) => (
            <CarouselItem key={index}>
              <div className="h-64 w-full bg-muted/30 rounded-md flex items-center justify-center">
                <img 
                  src={image} 
                  alt={`Business image ${index + 1}`}
                  className="max-w-full max-h-full object-contain rounded-md"
                />
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
        {images.length > 1 && (
          <>
            <CarouselPrevious className="left-2" />
            <CarouselNext className="right-2" />
          </>
        )}
      </Carousel>
      
      {/* Navigation dots */}
      <div className="flex justify-center gap-2 mt-2">
        {images.map((_, index) => (
          <Button
            key={index}
            variant="ghost"
            size="sm"
            className={cn(
              "w-2 h-2 p-0 rounded-full",
              index === currentIndex 
                ? "bg-primary hover:bg-primary/90" 
                : "bg-gray-200 hover:bg-gray-300"
            )}
            onClick={() => onImageChange(index)}
          />
        ))}
      </div>
    </div>
  );
};

export default ImageCarousel;
