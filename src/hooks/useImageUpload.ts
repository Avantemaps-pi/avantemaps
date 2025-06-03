
import { useState } from 'react';

export const useImageUpload = () => {
  const [selectedImages, setSelectedImages] = useState<File[]>([]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const newImage = e.target.files[0];
      setSelectedImages(prev => {
        const updatedImages = [...prev, newImage].slice(0, 3);
        return updatedImages;
      });
    }
  };

  const handleImageRemove = (index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
  };

  return {
    selectedImages,
    handleImageUpload,
    handleImageRemove
  };
};
