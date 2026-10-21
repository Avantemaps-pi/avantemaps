
import React from 'react';

interface ImageUploadCounterProps {
  currentCount: number;
  maxCount: number;
}

const ImageUploadCounter: React.FC<ImageUploadCounterProps> = ({ currentCount, maxCount }) => {
  return (
    <span className="text-sm text-muted-foreground mt-1 block">
      ({currentCount}/{maxCount})
    </span>
  );
};

export default ImageUploadCounter;
