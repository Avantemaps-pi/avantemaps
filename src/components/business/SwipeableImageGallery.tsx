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
  onClick?: (() => void) | undefined;
  previewMode?: boolean | undefined;
  imageClassName?: string | undefined;
  hideIndicators?: boolean | undefined;
  /** No-op: photos only change on swipe or dot tap. Kept for existing callers. */
  paused?: boolean | undefined;
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
  imageClassName,
  hideIndicators = false,
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
      let offset = eventData.deltaX;
      if ((currentIndex === 0 && offset > 0) || 
          (currentIndex === images.length - 1 && offset < 0)) {
        offset = offset * 0.3;
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
        className={imageClassName}
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
    <div 
      className="relative overflow-hidden rounded-lg" 
      {...handlers}
      onClick={previewMode ? handleClick : undefined}
    >
      {/* Images container */}
      <div 
        className="flex transition-transform duration-300 ease-out motion-reduce:transition-none"
        style={{ 
          transform: `translateX(calc(-${currentIndex * 100}% + ${swipeOffset}px))`,
          transitionDuration: swipeOffset !== 0 ? '0ms' : '300ms',
        }}
      >
        {images.map((image, index) => (
          <div key={index} className="w-full flex-shrink-0">
            <PlaceCardImage 
              image={Math.abs(index - currentIndex) <= 1 ? image : undefined} 
              name={`${name} - Image ${index + 1}`}
              onClick={previewMode ? undefined : handleClick}
              className={imageClassName}
              loading={index === 0 ? 'eager' : 'lazy'}
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

      {images.length > 1 && !hideIndicators && (
        <>
          <span
            aria-hidden="true"
            className="absolute top-2 right-2 z-10 rounded-full bg-overlay px-2 py-0.5 text-xs text-white"
          >
            {currentIndex + 1} / {images.length}
          </span>
          {/* Dots: 44px-tall hit row, dots sit 10px from the bottom */}
          <div className="absolute inset-x-0 bottom-0 z-10 flex h-11 justify-center">
            {images.map((_, index) => (
              <button
                key={index}
                type="button"
                onClick={(e) => handleIndicatorClick(index, e)}
                aria-label={`Photo ${index + 1} of ${images.length}`}
                aria-current={index === currentIndex}
                className="flex h-11 items-end justify-center px-1 pb-2.5"
              >
                <span
                  className={`block h-1.5 rounded-full ring-1 ring-overlay transition-all motion-reduce:transition-none ${
                    index === currentIndex ? 'w-[18px] bg-white' : 'w-1.5 bg-white/70'
                  }`}
                />
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default SwipeableImageGallery;
