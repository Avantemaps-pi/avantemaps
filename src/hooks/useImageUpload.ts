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

      // Verify we have a valid session before uploading
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session?.user) {
        console.error('No valid session for upload:', sessionError?.message || 'No session');
        errors.push('Authentication required for image upload. Please log in again.');
        toast.error('Session expired. Please re-authenticate to upload images.');
        setImages(prev => prev.map(img => ({ 
          ...img, 
          status: 'error' as const, 
          error: 'Authentication required' 
        })));
        return {
          success: false,
          successfulUrls: [],
          failedCount: images.length,
          errors,
        };
      }
      
      console.log('Uploading images with auth.uid:', session.user.id);

      // Upload images sequentially with retry logic
      const uploadResults: { index: number; success: boolean; url: string | null }[] = [];
      
      for (let index = 0; index < compressionResults.length; index++) {
        const result = compressionResults[index];
        
        if (!result.success || !result.file) {
          uploadResults.push({ index, success: false, url: null });
          continue;
        }

        const timestamp = Date.now();
        const filePath = `${businessId}/image-${index}-${timestamp}.webp`;
        console.log(`[Upload] Starting upload ${index + 1}/${compressionResults.length}: ${filePath}`);

        // Update status for this specific image
        setImages(prev => prev.map((img, i) => 
          i === index ? { ...img, status: 'uploading' as const } : img
        ));

        let uploadSuccess = false;
        let publicUrl: string | null = null;
        let lastError: string | null = null;

        // Try upload with up to 2 retries (helps with transient RLS propagation issues)
        for (let attempt = 0; attempt < 3 && !uploadSuccess; attempt++) {
          const delayMs = attempt === 0 ? 0 : attempt === 1 ? 800 : 1500;
          if (delayMs > 0) {
            console.log(`[Upload] Retry attempt ${attempt} for ${result.originalName} (waiting ${delayMs}ms)`);
            await new Promise(resolve => setTimeout(resolve, delayMs));
          }

          try {
            const { error: uploadError } = await supabase.storage
              .from(bucketName)
              .upload(filePath, result.file, {
                cacheControl: '3600',
                upsert: attempt > 0,
              });

            if (uploadError) {
              console.error(`[Upload] Error for ${result.originalName} (attempt ${attempt + 1}):`, uploadError);
              lastError = uploadError.message;
            } else {
              const { data } = supabase.storage
                .from(bucketName)
                .getPublicUrl(filePath);

              console.log(`[Upload] Success: ${data.publicUrl}`);
              publicUrl = data.publicUrl;
              uploadSuccess = true;
            }
          } catch (err) {
            lastError = err instanceof Error ? err.message : 'Unknown error';
            console.error(`[Upload] Exception for ${result.originalName} (attempt ${attempt + 1}):`, err);
          }
        }

        if (!uploadSuccess) {
          const displayError = lastError || 'Upload failed';
          errors.push(`Failed to upload "${result.originalName}": ${displayError}`);
          setImages(prev => prev.map((img, i) =>
            i === index ? { ...img, status: 'error' as const, error: displayError } : img
          ));
        }

        uploadResults.push({ index, success: uploadSuccess, url: publicUrl });

        // Small delay between uploads to prevent rate limiting
        if (index < compressionResults.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }

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
