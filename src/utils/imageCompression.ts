export interface CompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  targetFormat?: 'image/jpeg' | 'image/webp' | 'image/png';
}

const DEFAULT_OPTIONS: Required<CompressionOptions> = {
  maxWidth: 1920,
  maxHeight: 1920,
  quality: 0.85,
  targetFormat: 'image/webp',
};

// Constants for validation
export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

export interface ImageValidationResult {
  valid: boolean;
  error?: string;
  errorDescription?: string;
}

/**
 * Validates an image file before processing
 * @param file - The image file to validate
 * @param existingFiles - Array of existing files to check for duplicates
 * @param maxImages - Maximum number of images allowed
 * @returns Validation result with error message if invalid
 */
export const validateImageFile = (
  file: File,
  existingFiles: File[] = [],
  maxImages: number = 3
): ImageValidationResult => {
  // Check if max images reached
  if (existingFiles.length >= maxImages) {
    return {
      valid: false,
      error: `Maximum ${maxImages} images allowed`,
      errorDescription: 'Please remove an existing image before adding a new one.',
    };
  }

  // Check file type
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: `Invalid file type: ${file.type.split('/')[1]?.toUpperCase() || 'Unknown'}`,
      errorDescription: 'Please upload JPG, PNG, GIF, or WebP images only.',
    };
  }

  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    const sizeMB = (file.size / 1024 / 1024).toFixed(1);
    return {
      valid: false,
      error: `File too large: ${sizeMB}MB`,
      errorDescription: 'Maximum file size is 10MB. Please choose a smaller image.',
    };
  }

  // Check for duplicates (by name and size)
  const isDuplicate = existingFiles.some(
    existing => existing.name === file.name && existing.size === file.size
  );
  if (isDuplicate) {
    return {
      valid: false,
      error: 'Duplicate image',
      errorDescription: `"${file.name}" has already been added.`,
    };
  }

  return { valid: true };
};

/**
 * Compresses an image file by resizing and reducing quality
 * @param file - The original image file
 * @param options - Compression options
 * @returns Compressed image as a File object
 */
export const compressImage = async (
  file: File,
  options: CompressionOptions = {}
): Promise<File> => {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onerror = () => reject(new Error('Failed to read file'));
    
    reader.onload = (e) => {
      const img = new Image();
      
      img.onerror = () => reject(new Error('Failed to load image'));
      
      img.onload = () => {
        try {
          // Calculate new dimensions while maintaining aspect ratio
          let { width, height } = img;
          
          if (width > opts.maxWidth || height > opts.maxHeight) {
            const aspectRatio = width / height;
            
            if (width > height) {
              width = opts.maxWidth;
              height = Math.round(width / aspectRatio);
            } else {
              height = opts.maxHeight;
              width = Math.round(height * aspectRatio);
            }
          }

          // Create canvas and draw resized image
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Failed to get canvas context'));
            return;
          }

          // Use high-quality image smoothing
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, width, height);

          // Convert canvas to blob
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error('Failed to compress image'));
                return;
              }

              // Create a new File object from the blob
              const compressedFile = new File(
                [blob],
                file.name.replace(/\.[^/.]+$/, '.webp'), // Change extension to .webp
                {
                  type: opts.targetFormat,
                  lastModified: Date.now(),
                }
              );

              resolve(compressedFile);
            },
            opts.targetFormat,
            opts.quality
          );
        } catch (error) {
          reject(error);
        }
      };

      img.src = e.target?.result as string;
    };

    reader.readAsDataURL(file);
  });
};

export interface CompressionResult {
  file: File | null;
  originalName: string;
  originalSize: number;
  success: boolean;
  error?: string;
}

/**
 * Safely compresses an image, returning result with error info instead of throwing
 * @param file - The original image file
 * @param options - Compression options
 * @returns CompressionResult with success status and error message if failed
 */
export const compressImageSafe = async (
  file: File,
  options: CompressionOptions = {}
): Promise<CompressionResult> => {
  try {
    const compressed = await compressImage(file, options);
    return {
      file: compressed,
      originalName: file.name,
      originalSize: file.size,
      success: true,
    };
  } catch (error) {
    return {
      file: null,
      originalName: file.name,
      originalSize: file.size,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown compression error',
    };
  }
};

/**
 * Compresses multiple images in parallel with individual error handling
 * @param files - Array of image files
 * @param options - Compression options
 * @returns Array of compression results
 */
export const compressImagesSafe = async (
  files: File[],
  options: CompressionOptions = {}
): Promise<CompressionResult[]> => {
  return Promise.all(files.map(file => compressImageSafe(file, options)));
};

/**
 * Compresses multiple images in parallel
 * @param files - Array of image files
 * @param options - Compression options
 * @returns Array of compressed images
 */
export const compressImages = async (
  files: File[],
  options: CompressionOptions = {}
): Promise<File[]> => {
  return Promise.all(files.map(file => compressImage(file, options)));
};

/**
 * Gets the size reduction percentage
 * @param originalSize - Original file size in bytes
 * @param compressedSize - Compressed file size in bytes
 * @returns Percentage reduction
 */
export const getSizeReduction = (originalSize: number, compressedSize: number): number => {
  return Math.round(((originalSize - compressedSize) / originalSize) * 100);
};
