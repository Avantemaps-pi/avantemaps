
import React from 'react';
import { FormItem, FormLabel, FormControl, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import ImageUploadCounter from './ImageUploadCounter';
import ImageCarousel from '../../ImageCarousel';
import ImageCropDialog from './ImageCropDialog';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { toast } from 'sonner';

interface BusinessImageUploadProps {
  selectedImages: File[];
  handleImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleImageRemove?: (index: number) => void;
  handleImageReorder?: (newImages: File[]) => void;
  maxImages?: number;
  disabled?: boolean;
}

const BusinessImageUpload: React.FC<BusinessImageUploadProps> = ({
  selectedImages, 
  handleImageUpload,
  handleImageRemove,
  handleImageReorder,
  maxImages = 3,
  disabled = false
}) => {
  const [currentImageIndex, setCurrentImageIndex] = React.useState(0);
  const [cropDialogOpen, setCropDialogOpen] = React.useState(false);
  const [pendingImageUrl, setPendingImageUrl] = React.useState<string>('');
  const [pendingImageFile, setPendingImageFile] = React.useState<File | null>(null);
  
  const imageUrls = selectedImages.map(file => URL.createObjectURL(file));
  
  React.useEffect(() => {
    // Cleanup URLs when component unmounts
    return () => {
      imageUrls.forEach(URL.revokeObjectURL);
      if (pendingImageUrl) URL.revokeObjectURL(pendingImageUrl);
    };
  }, []);

  const handleReorder = (newOrder: string[]) => {
    if (!handleImageReorder) return;
    
    // Map URLs back to File objects in new order
    const newImages = newOrder.map(url => {
      const index = imageUrls.indexOf(url);
      return selectedImages[index];
    });
    
    handleImageReorder(newImages);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Create preview URL
    const url = URL.createObjectURL(file);
    setPendingImageUrl(url);
    setPendingImageFile(file);
    setCropDialogOpen(true);
  };

  const handleCropComplete = (croppedBlob: Blob) => {
    if (!pendingImageFile) return;

    // Convert blob to File
    const croppedFile = new File([croppedBlob], pendingImageFile.name, {
      type: 'image/jpeg',
      lastModified: Date.now(),
    });

    // Create a synthetic event to pass to the original handler
    const syntheticEvent = {
      target: {
        files: [croppedFile] as unknown as FileList,
      },
    } as React.ChangeEvent<HTMLInputElement>;

    handleImageUpload(syntheticEvent);
    
    // Cleanup
    URL.revokeObjectURL(pendingImageUrl);
    setPendingImageUrl('');
    setPendingImageFile(null);
    
    toast.success('Image cropped and ready');
  };

  return (
    <FormItem>
      <FormLabel className="text-base mb-1.5">Business Images</FormLabel>
      <FormControl>
        <Input 
          type="file" 
          accept="image/*" 
          onChange={handleFileSelect}
          disabled={selectedImages.length >= maxImages || disabled}
          className="cursor-pointer"
        />
      </FormControl>
      
      <ImageCropDialog
        open={cropDialogOpen}
        onOpenChange={setCropDialogOpen}
        imageUrl={pendingImageUrl}
        onCropComplete={handleCropComplete}
      />
      <FormDescription className="text-sm mt-1.5 flex items-center justify-between">
        <span>Upload images of your business (max {maxImages}). Drag to reorder.</span>
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
              onReorder={handleReorder}
            />
            
            {handleImageRemove && !disabled && (
              <Button
                type="button"
                size="icon"
                variant="destructive"
                className="absolute -top-2 -right-2 h-6 w-6 rounded-full z-10"
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
