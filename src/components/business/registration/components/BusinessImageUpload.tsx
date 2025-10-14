
import React from 'react';
import { FormItem, FormLabel, FormControl, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import ImageUploadCounter from './ImageUploadCounter';
import ImageCarousel from '../../ImageCarousel';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

interface BusinessImageUploadProps {
  selectedImages: File[];
  handleImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleImageRemove?: (index: number) => void;
  maxImages?: number;
  disabled?: boolean;
}

const BusinessImageUpload: React.FC<BusinessImageUploadProps> = ({
  selectedImages, 
  handleImageUpload,
  handleImageRemove,
  maxImages = 3,
  disabled = false
}) => {
  const [currentImageIndex, setCurrentImageIndex] = React.useState(0);
  
  const imageUrls = selectedImages.map(file => URL.createObjectURL(file));
  
  React.useEffect(() => {
    // Cleanup URLs when component unmounts
    return () => {
      imageUrls.forEach(URL.revokeObjectURL);
    };
  }, []);

  return (
    <FormItem>
      <FormLabel className="text-base mb-1.5">Business Images</FormLabel>
      <FormControl>
        <Input 
          type="file" 
          accept="image/*" 
          onChange={handleImageUpload}
          disabled={selectedImages.length >= maxImages || disabled}
          className="cursor-pointer"
        />
      </FormControl>
      <FormDescription className="text-sm mt-1.5 flex items-center justify-between">
        <span>Upload images of your business (max {maxImages})</span>
        <ImageUploadCounter 
          currentCount={selectedImages.length} 
          maxCount={maxImages} 
        />
      </FormDescription>
      
      {selectedImages.length > 0 && (
        <div className="mt-4">
          <div className="relative">
            <ImageCarousel
              images={imageUrls}
              currentIndex={currentImageIndex}
              onImageChange={setCurrentImageIndex}
            />
            
            {handleImageRemove && !disabled && (
              <Button
                type="button"
                size="icon"
                variant="destructive"
                className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
                onClick={() => handleImageRemove(currentImageIndex)}
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>
      )}
    </FormItem>
  );
};

export default BusinessImageUpload;
