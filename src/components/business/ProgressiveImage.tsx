import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { ImageIcon } from 'lucide-react';

interface ProgressiveImageProps {
  src: string;
  alt: string;
  className?: string;
  onClick?: () => void;
  onError?: (e: React.SyntheticEvent<HTMLImageElement>) => void;
  loading?: 'eager' | 'lazy';
}

const ProgressiveImage: React.FC<ProgressiveImageProps> = ({
  src,
  alt,
  className,
  onClick,
  onError,
  loading = 'lazy',
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  // If no src provided or src is empty, show placeholder immediately
  const showPlaceholder = !src || hasError;

  return (
    <div className="relative w-full h-full">
      {/* Loading state - blur placeholder */}
      {!isLoaded && !showPlaceholder && (
        <div className="absolute inset-0 bg-muted/30 animate-pulse rounded-md" />
      )}
      
      {/* Fallback placeholder when no image or error */}
      {showPlaceholder && (
        <div className="absolute inset-0 bg-muted/30 rounded-md flex items-center justify-center">
          <ImageIcon className="h-12 w-12 text-muted-foreground/50" />
        </div>
      )}
      
      {!showPlaceholder && (
        <img
          src={src}
          alt={alt}
          loading={loading}
          className={cn(
            'transition-opacity duration-300',
            isLoaded ? 'opacity-100' : 'opacity-0',
            className
          )}
          onClick={onClick}
          onLoad={() => setIsLoaded(true)}
          onError={(e) => {
            setHasError(true);
            setIsLoaded(true);
            onError?.(e);
          }}
        />
      )}
    </div>
  );
};

export default ProgressiveImage;
