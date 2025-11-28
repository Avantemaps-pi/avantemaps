import React, { useState } from 'react';
import { cn } from '@/lib/utils';

interface ProgressiveImageProps {
  src: string;
  alt: string;
  className?: string;
  onClick?: () => void;
  onError?: (e: React.SyntheticEvent<HTMLImageElement>) => void;
}

const ProgressiveImage: React.FC<ProgressiveImageProps> = ({
  src,
  alt,
  className,
  onClick,
  onError,
}) => {
  const [isLoaded, setIsLoaded] = useState(false);

  return (
    <div className="relative w-full h-full">
      {/* Blur placeholder */}
      {!isLoaded && (
        <div className="absolute inset-0 bg-muted/30 animate-pulse rounded-md" />
      )}
      
      <img
        src={src}
        alt={alt}
        loading="lazy"
        className={cn(
          'transition-opacity duration-300',
          isLoaded ? 'opacity-100' : 'opacity-0',
          className
        )}
        onClick={onClick}
        onLoad={() => setIsLoaded(true)}
        onError={(e) => {
          setIsLoaded(true);
          onError?.(e);
        }}
      />
    </div>
  );
};

export default ProgressiveImage;
