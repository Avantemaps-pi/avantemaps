import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { 
  validateImageFile, 
  compressImagesSafe, 
  getSizeReduction,
  CompressionResult 
} from '@/utils/imageCompression';
import { supabase } from '@/integrations/supabase/client';

export interface ImageUploadStatus {
  file: File;
  id: string;
  status: 'pending' | 'compressing' | 'uploading' | 'success' | 'error';
  error?: string;
  previewUrl?: string;
}

export interface UploadResult {
  success: boolean;
  successfulUrls: string[];
  failedCount: number;
  errors: string[];
}

interface UseImageUploadOptions {
  maxImages?: number;
  bucketName?: string;
}

export const useImageUpload = (options: UseImageUploadOptions = {}) => {
  const { maxImages = 3, bucketName = 'business-images' } = options;
  
  const [images, setImages] = useState<ImageUploadStatus[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  const addImage = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input value so the same file can be selected again if removed
    e.target.value = '';

    // Get current files for validation
    const currentFiles = images.map(img => img.file);
    
    // Validate the file
    const validation = validateImageFile(file, currentFiles, maxImages);
    
    if (!validation.valid) {
      toast.error(validation.error, {
        description: validation.errorDescription,
      });
      return;
    }

    // Create preview URL
    const previewUrl = URL.createObjectURL(file);
    
    // Add to state
    const newImage: ImageUploadStatus = {
      file,
      id: generateId(),
      status: 'pending',
      previewUrl,
    };

    setImages(prev => [...prev, newImage]);
    toast.success(`Image added: ${file.name}`);
  }, [images, maxImages]);

  const removeImage = useCallback((id: string) => {
    setImages(prev => {
      const imageToRemove = prev.find(img => img.id === id);
      if (imageToRemove?.previewUrl) {
        URL.revokeObjectURL(imageToRemove.previewUrl);
      }
      return prev.filter(img => img.id !== id);
    });
  }, []);

  const reorderImages = useCallback((newOrder: ImageUploadStatus[]) => {
    setImages(newOrder);
  }, []);

  const clearImages = useCallback(() => {
    images.forEach(img => {
      if (img.previewUrl) {
        URL.revokeObjectURL(img.previewUrl);
      }
    });
    setImages([]);
  }, [images]);

  const uploadImages = useCallback(async (businessId: number): Promise<UploadResult> => {
    if (images.length === 0) {
      return { success: true, successfulUrls: [], failedCount: 0, errors: [] };
    }

    setIsProcessing(true);
    const errors: string[] = [];
    const successfulUrls: string[] = [];

    try {
      // Update status to compressing
      setImages(prev => prev.map(img => ({ ...img, status: 'compressing' as const })));
      toast.info('Optimizing images...');

      // Compress all images with safe error handling
      const files = images.map(img => img.file);
      const compressionResults = await compressImagesSafe(files, {
        maxWidth: 1920,
        maxHeight: 1920,
        quality: 0.85,
        targetFormat: 'image/webp',
      });

      // Calculate size reduction for successfully compressed images
      const successfulCompressions = compressionResults.filter(r => r.success);
      if (successfulCompressions.length > 0) {
        const totalOriginal = successfulCompressions.reduce((sum, r) => sum + r.originalSize, 0);
        const totalCompressed = successfulCompressions.reduce((sum, r) => sum + (r.file?.size || 0), 0);
        const reduction = getSizeReduction(totalOriginal, totalCompressed);
        console.log(`Image compression: ${reduction}% size reduction`);
      }

      // Process compression results and update statuses
      const updatedImages = images.map((img, index) => {
        const result = compressionResults[index];
        if (!result.success) {
          errors.push(`Failed to process "${result.originalName}": ${result.error}`);
          return { ...img, status: 'error' as const, error: result.error };
        }
        return { ...img, status: 'uploading' as const };
      });
      setImages(updatedImages);

      // Show compression errors
      const compressionErrors = compressionResults.filter(r => !r.success);
      if (compressionErrors.length > 0) {
        toast.error(`${compressionErrors.length} image(s) failed to process`, {
          description: compressionErrors.map(e => e.originalName).join(', '),
        });
      }

      // Upload successfully compressed images
      const uploadPromises = compressionResults.map(async (result, index) => {
        if (!result.success || !result.file) {
          return { index, success: false, url: null };
        }

        const filePath = `${businessId}/image-${index}-${Date.now()}.webp`;

        try {
          const { error: uploadError } = await supabase.storage
            .from(bucketName)
            .upload(filePath, result.file, { 
              cacheControl: '3600', 
              upsert: false 
            });

          if (uploadError) {
            errors.push(`Failed to upload "${result.originalName}": ${uploadError.message}`);
            return { index, success: false, url: null };
          }

          const { data } = supabase.storage
            .from(bucketName)
            .getPublicUrl(filePath);

          return { index, success: true, url: data.publicUrl };
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : 'Unknown error';
          errors.push(`Failed to upload "${result.originalName}": ${errorMessage}`);
          return { index, success: false, url: null };
        }
      });

      const uploadResults = await Promise.all(uploadPromises);

      // Update final statuses
      setImages(prev => prev.map((img, index) => {
        const uploadResult = uploadResults[index];
        if (uploadResult.success) {
          return { ...img, status: 'success' as const };
        } else if (img.status !== 'error') {
          return { ...img, status: 'error' as const, error: 'Upload failed' };
        }
        return img;
      }));

      // Collect successful URLs
      uploadResults.forEach(result => {
        if (result.success && result.url) {
          successfulUrls.push(result.url);
        }
      });

      // Show final toast
      const failedCount = images.length - successfulUrls.length;
      if (failedCount > 0 && successfulUrls.length > 0) {
        toast.warning(`${successfulUrls.length} image(s) uploaded, ${failedCount} failed`, {
          description: 'Check the upload status for details.',
        });
      } else if (failedCount > 0 && successfulUrls.length === 0) {
        toast.error('All image uploads failed', {
          description: 'Please try again or use different images.',
        });
      } else if (successfulUrls.length > 0) {
        toast.success(`${successfulUrls.length} image(s) uploaded successfully!`);
      }

      return {
        success: successfulUrls.length > 0,
        successfulUrls,
        failedCount,
        errors,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      errors.push(`Upload process failed: ${errorMessage}`);
      toast.error('Image upload failed', {
        description: errorMessage,
      });
      
      // Mark all as error
      setImages(prev => prev.map(img => ({ 
        ...img, 
        status: 'error' as const, 
        error: 'Upload process failed' 
      })));

      return {
        success: false,
        successfulUrls: [],
        failedCount: images.length,
        errors,
      };
    } finally {
      setIsProcessing(false);
    }
  }, [images, bucketName]);

  const retryImage = useCallback((id: string) => {
    setImages(prev => prev.map(img => 
      img.id === id 
        ? { ...img, status: 'pending' as const, error: undefined }
        : img
    ));
  }, []);

  // Get files for compatibility with existing code
  const getFiles = useCallback(() => images.map(img => img.file), [images]);

  return {
    images,
    isProcessing,
    addImage,
    removeImage,
    reorderImages,
    clearImages,
    uploadImages,
    retryImage,
    getFiles,
    hasImages: images.length > 0,
    canAddMore: images.length < maxImages,
  };
};
