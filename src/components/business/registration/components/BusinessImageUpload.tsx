import React, { useState, useEffect, useRef } from 'react';
import { FormItem, FormLabel, FormControl, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { X, CheckCircle, AlertCircle, Loader2, ImageIcon, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ImageUploadStatus } from '@/hooks/useImageUpload';
import ImageUploadCounter from './ImageUploadCounter';
import ImageCropper from './ImageCropper';

interface BusinessImageUploadProps {
  images: ImageUploadStatus[];
  onAddImage: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onAddCroppedImage: (file: File) => void;
  onRemoveImage: (id: string) => void;
  onRetryImage?: ((id: string) => void) | undefined;
  maxImages?: number;
  disabled?: boolean | undefined;
  isProcessing?: boolean | undefined;
  existingImages?: string[];
  onRemoveExistingImage?: ((index: number) => void) | undefined;
}

// Component to handle image preview with proper blob URL regeneration
const ImagePreview: React.FC<{ 
  file: File; 
  previewUrl?: string | undefined; 
  alt: string; 
  className?: string | undefined;
}> = ({ file, previewUrl, alt, className }) => {
  const [localUrl, setLocalUrl] = useState<string | null>(null);
  const [hasError, setHasError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    let url: string | null = null;
    
    // Reset error state when file changes
    setHasError(false);
    setRetryCount(0);
    
    // Try the provided previewUrl first
    if (previewUrl) {
      setLocalUrl(previewUrl);
    } else if (file) {
      // Create a new blob URL from the file
      try {
        url = URL.createObjectURL(file);
        setLocalUrl(url);
      } catch (e) {
        console.error('[ImagePreview] Failed to create blob URL:', e);
        setHasError(true);
      }
    }
    
    return () => {
      if (url) {
        URL.revokeObjectURL(url);
      }
    };
  }, [file, previewUrl]);

  const handleError = () => {
    console.log('[ImagePreview] Image load error, retry count:', retryCount);
    
    // If the previewUrl failed, try creating a new blob URL from the file
    if (file && retryCount < 2) {
      try {
        const newUrl = URL.createObjectURL(file);
        setLocalUrl(newUrl);
        setRetryCount(prev => prev + 1);
      } catch (e) {
        console.error('[ImagePreview] Failed to create retry blob URL:', e);
        setHasError(true);
      }
    } else {
      setHasError(true);
    }
  };

  if (hasError || !localUrl) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-muted gap-1">
        <ImageIcon className="h-8 w-8 text-muted-foreground/50" />
        <span className="text-xs text-muted-foreground">Preview unavailable</span>
      </div>
    );
  }

  return (
    <img
      src={localUrl}
      alt={alt}
      className={className}
      onError={handleError}
    />
  );
};

const StatusIcon: React.FC<{ status: ImageUploadStatus['status'] }> = ({ status }) => {
  switch (status) {
    case 'compressing':
    case 'uploading':
      return <Loader2 className="h-4 w-4 animate-spin text-primary" />;
    case 'success':
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    case 'error':
      return <AlertCircle className="h-4 w-4 text-destructive" />;
    default:
      return null;
  }
};

const StatusLabel: React.FC<{ status: ImageUploadStatus['status']; error?: string | undefined }> = ({ status, error }) => {
  switch (status) {
    case 'compressing':
      return <span className="text-xs text-muted-foreground">Optimizing...</span>;
    case 'uploading':
      return <span className="text-xs text-muted-foreground">Uploading...</span>;
    case 'success':
      return <span className="text-xs text-green-600">Ready</span>;
    case 'error':
      return (
        <span className="text-xs text-destructive truncate max-w-[80px]" title={error}>
          {error?.includes('permission') ? 'Permission denied' : 'Failed'}
        </span>
      );
    default:
      return <span className="text-xs text-muted-foreground">Pending</span>;
  }
};

const BusinessImageUpload: React.FC<BusinessImageUploadProps> = ({
  images,
  onAddImage,
  onAddCroppedImage,
  onRemoveImage,
  onRetryImage,
  maxImages = 3,
  disabled = false,
  isProcessing = false,
  existingImages = [],
  onRemoveExistingImage,
}) => {
  const [imagesToRemove, setImagesToRemove] = useState<number[]>([]);
  const [cropperOpen, setCropperOpen] = useState(false);
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const [originalFileName, setOriginalFileName] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const placeholderInputRef = useRef<HTMLInputElement>(null);
  
  // Calculate how many images are effectively in use
  const activeExistingImages = existingImages.filter((_, i) => !imagesToRemove.includes(i));
  const totalImageCount = activeExistingImages.length + images.length;
  const canAddMore = totalImageCount < maxImages && !disabled && !isProcessing;

  const handleRemoveExisting = (index: number) => {
    setImagesToRemove(prev => [...prev, index]);
    onRemoveExistingImage?.(index);
  };

  // Handle file selection - open cropper instead of directly adding
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Reset input so same file can be selected again
    e.target.value = '';
    
    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      return;
    }
    
    // Create object URL for cropper
    const imageUrl = URL.createObjectURL(file);
    setImageToCrop(imageUrl);
    setOriginalFileName(file.name);
    setCropperOpen(true);
  };

  // Handle cropped image
  const handleCropComplete = (croppedFile: File) => {
    if (imageToCrop) {
      URL.revokeObjectURL(imageToCrop);
    }
    setImageToCrop(null);
    setCropperOpen(false);
    onAddCroppedImage(croppedFile);
  };

  // Handle cropper close
  const handleCropperClose = () => {
    if (imageToCrop) {
      URL.revokeObjectURL(imageToCrop);
    }
    setImageToCrop(null);
    setCropperOpen(false);
  };

  return (
    <FormItem>
      <FormLabel className="text-base mb-1.5">Business Images</FormLabel>
      <FormControl>
        <div className="space-y-4">
          {/* File Input */}
          <div className="flex items-center gap-4">
            <Input 
              ref={fileInputRef}
              type="file" 
              accept="image/jpeg,image/png,image/gif,image/webp" 
              onChange={handleFileSelect}
              disabled={!canAddMore}
              className={cn(
                "cursor-pointer flex-1",
                !canAddMore && "opacity-50 cursor-not-allowed"
              )}
            />
            <ImageUploadCounter 
              currentCount={totalImageCount} 
              maxCount={maxImages} 
            />
          </div>
          
          <FormDescription className="text-sm">
            Upload images of your business (max {maxImages}). Images will be cropped to 16:9 for optimal display.
          </FormDescription>

          {/* Image Cropper Dialog */}
          {imageToCrop && (
            <ImageCropper
              open={cropperOpen}
              imageSrc={imageToCrop}
              onClose={handleCropperClose}
              onCropComplete={handleCropComplete}
              originalFileName={originalFileName}
            />
          )}

          {/* Combined Image Grid - Existing + New */}
          {(activeExistingImages.length > 0 || images.length > 0) && (
            <div className="grid grid-cols-3 gap-3">
              {/* Existing Images */}
              {existingImages.map((imageUrl, index) => {
                const isMarkedForRemoval = imagesToRemove.includes(index);
                if (isMarkedForRemoval) return null;
                
                return (
                  <div
                    key={`existing-${index}`}
                    className="relative aspect-square rounded-lg overflow-hidden border-2 border-green-500 bg-green-50 dark:bg-green-950/20"
                  >
                    <img
                      src={imageUrl}
                      alt={`Business image ${index + 1}`}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/placeholder.svg';
                      }}
                    />

                    {/* Status Overlay */}
                    <div className="absolute bottom-0 left-0 right-0 bg-background/90 backdrop-blur-xs px-2 py-1.5 flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span className="text-xs text-green-600">Saved</span>
                      </div>
                      {index === 0 && activeExistingImages.length > 0 && images.length === 0 && (
                        <span className="text-xs font-medium text-primary">Main</span>
                      )}
                    </div>

                    {/* Remove Button */}
                    {!isProcessing && onRemoveExistingImage && (
                      <Button
                        type="button"
                        size="icon"
                        variant="destructive"
                        className="absolute top-1 right-1 h-6 w-6 rounded-full shadow-md"
                        onClick={() => handleRemoveExisting(index)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                );
              })}

              {/* New Images */}
              {images.map((image, index) => (
                <div
                  key={image.id}
                  className={cn(
                    "relative aspect-square rounded-lg overflow-hidden border-2 transition-all",
                    image.status === 'error' 
                      ? "border-destructive bg-destructive/10" 
                      : image.status === 'success'
                      ? "border-green-500 bg-green-50 dark:bg-green-950/20"
                      : "border-border bg-muted/30"
                  )}
                >
                  {/* Image Preview */}
                  <ImagePreview 
                    file={image.file}
                    previewUrl={image.previewUrl}
                    alt={`New image ${index + 1}`}
                    className={cn(
                      "w-full h-full object-cover transition-opacity",
                      (image.status === 'compressing' || image.status === 'uploading') && "opacity-50"
                    )}
                  />

                  {/* Status Overlay */}
                  <div className="absolute bottom-0 left-0 right-0 bg-background/90 backdrop-blur-xs px-2 py-1.5 flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <StatusIcon status={image.status} />
                      <StatusLabel status={image.status} error={image.error} />
                    </div>
                    {index === 0 && activeExistingImages.length === 0 && (
                      <span className="text-xs font-medium text-primary">Main</span>
                    )}
                  </div>

                  {/* Error Message */}
                  {image.status === 'error' && image.error && (
                    <div className="absolute top-0 left-0 right-0 bg-destructive/90 px-2 py-1">
                      <p className="text-xs text-destructive-foreground truncate">
                        {image.error}
                      </p>
                    </div>
                  )}

                  {/* Remove Button */}
                  {!isProcessing && (
                    <Button
                      type="button"
                      size="icon"
                      variant="destructive"
                      className="absolute top-1 right-1 h-6 w-6 rounded-full shadow-md"
                      onClick={() => onRemoveImage(image.id)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  )}

                  {/* Retry Button for failed uploads */}
                  {image.status === 'error' && onRetryImage && !isProcessing && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
                      onClick={() => onRetryImage(image.id)}
                    >
                      Retry
                    </Button>
                  )}

                  {/* Processing Overlay */}
                  {(image.status === 'compressing' || image.status === 'uploading') && (
                    <div className="absolute inset-0 flex items-center justify-center bg-background/50">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                  )}
                </div>
              ))}

              {/* Add More Placeholder */}
              {canAddMore && (
                <label
                  className={cn(
                    "aspect-square rounded-lg border-2 border-dashed border-muted-foreground/30",
                    "flex flex-col items-center justify-center gap-2 cursor-pointer",
                    "hover:border-primary hover:bg-primary/5 transition-colors"
                  )}
                >
                  <ImageIcon className="h-6 w-6 text-muted-foreground/50" />
                  <span className="text-xs text-muted-foreground">Add Image</span>
                  <Input 
                    ref={placeholderInputRef}
                    type="file" 
                    accept="image/jpeg,image/png,image/gif,image/webp" 
                    onChange={handleFileSelect}
                    className="sr-only"
                  />
                </label>
              )}
            </div>
          )}

          {/* Empty State */}
          {activeExistingImages.length === 0 && images.length === 0 && (
            <div className="border-2 border-dashed border-muted-foreground/30 rounded-lg p-8 text-center">
              <ImageIcon className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
              <p className="text-sm text-muted-foreground">
                No images added yet. Upload up to {maxImages} images to showcase your business.
              </p>
            </div>
          )}
        </div>
      </FormControl>
    </FormItem>
  );
};

export default BusinessImageUpload;
