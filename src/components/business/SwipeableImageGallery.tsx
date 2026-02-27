import React, { useState, useCallback } from 'react';
import { useSwipeable } from 'react-swipeable';
import PlaceCardImage from './PlaceCardImage';
import PlaceCardActions from './PlaceCardActions';

interface SwipeableImageGalleryProps {
  images: string[];
  name: string;
  isBookmarked: boolean;
  onBookmarkToggle: (e?: React.MouseEvent) => void;
  onShare: (e?: React.MouseEvent) => void;
  placeId: string;
  onClick?: () => void;
  previewMode?: boolean;
}

const SwipeableImageGallery: React.FC<SwipeableImageGalleryProps> = ({
  images,
  name,
  isBookmarked,
  onBookmarkToggle,
  onShare,
  placeId,
  onClick,
  previewMode = false,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);

  const goToNext = useCallback(() => {
    if (currentIndex < images.length - 1 && !isAnimating) {
      setIsAnimating(true);
      setCurrentIndex(prev => prev + 1);
      setTimeout(() => setIsAnimating(false), 300);
    }
  }, [currentIndex, images.length, isAnimating]);

  const goToPrev = useCallback(() => {
    if (currentIndex > 0 && !isAnimating) {
      setIsAnimating(true);
      setCurrentIndex(prev => prev - 1);
      setTimeout(() => setIsAnimating(false), 300);
    }
  }, [currentIndex, isAnimating]);

  const handlers = useSwipeable({
    onSwipedLeft: () => {
      setSwipeOffset(0);
      goToNext();
    },
    onSwipedRight: () => {
      setSwipeOffset(0);
      goToPrev();
    },
    onSwiping: (eventData) => {
      setIsSwiping(true);
      // Calculate offset with resistance at edges
      let offset = eventData.deltaX;
      
      // Add resistance when at edges
      if ((currentIndex === 0 && offset > 0) || 
          (currentIndex === images.length - 1 && offset < 0)) {
        offset = offset * 0.3; // Reduce movement at edges
      }
      
      setSwipeOffset(offset);
    },
    onTouchEndOrOnMouseUp: () => {
      setSwipeOffset(0);
      setTimeout(() => setIsSwiping(false), 50);
    },
    preventScrollOnSwipe: true,
    trackMouse: true,
    delta: 10,
    swipeDuration: 500,
  });

  const handleClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    // Only trigger navigation if we weren't swiping
    if (isSwiping) return;
    
    // Get click position relative to the image container
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const containerWidth = rect.width;
    
    // Click on right third = next, left third = prev, middle = onClick
    if (clickX > containerWidth * 0.66 && currentIndex < images.length - 1) {
      goToNext();
    } else if (clickX < containerWidth * 0.33 && currentIndex > 0) {
      goToPrev();
    } else if (onClick) {
      onClick();
    }
  }, [isSwiping, onClick, currentIndex, images.length, goToNext, goToPrev]);

  const handleIndicatorClick = useCallback((index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isAnimating && index !== currentIndex) {
      setIsAnimating(true);
      setCurrentIndex(index);
      setTimeout(() => setIsAnimating(false), 300);
    }
  }, [isAnimating, currentIndex]);

  if (images.length === 0) {
    return (
      <PlaceCardImage 
        image={undefined} 
        name={name} 
        onClick={previewMode ? undefined : onClick}
      >
        {!previewMode && (
          <PlaceCardActions 
            isBookmarked={isBookmarked} 
            onBookmarkToggle={onBookmarkToggle} 
            onShare={onShare} 
            placeName={name}
            placeId={placeId}
          />
        )}
      </PlaceCardImage>
    );
  }

  return (
    <div className="relative overflow-hidden" {...handlers} onClick={previewMode ? handleClick : undefined}>
      {/* Images container */}
      <div 
        className="flex transition-transform duration-300 ease-out"
        style={{ 
          transform: `translateX(calc(-${currentIndex * 100}% + ${swipeOffset}px))`,
          transitionDuration: swipeOffset !== 0 ? '0ms' : '300ms',
        }}
      >
        {images.map((image, index) => (
          <div key={index} className="w-full flex-shrink-0">
            <PlaceCardImage 
              image={image} 
              name={`${name} - Image ${index + 1}`}
              onClick={previewMode ? undefined : handleClick}
            >
              {index === currentIndex && !previewMode && (
                <PlaceCardActions 
                  isBookmarked={isBookmarked} 
                  onBookmarkToggle={onBookmarkToggle} 
                  onShare={onShare} 
                  placeName={name}
                  placeId={placeId}
                />
              )}
            </PlaceCardImage>
          </div>
        ))}
      </div>

      {/* Story-style indicator bars at top */}
      {images.length > 1 && (
        <div className="absolute top-0 left-0 right-0 flex gap-1 px-2 pt-2 z-10">
          {images.map((_, index) => (
            <button
              key={index}
              onClick={(e) => handleIndicatorClick(index, e)}
              className="h-[3px] flex-1 rounded-full bg-white/30 overflow-hidden"
              aria-label={`View image ${index + 1} of ${images.length}`}
            >
              <div
                className={`h-full rounded-full transition-all duration-300 ease-linear ${
                  index < currentIndex
                    ? 'w-full bg-white'
                    : index === currentIndex
                      ? 'w-full bg-white'
                      : 'w-0 bg-white'
                }`}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default SwipeableImageGallery;
