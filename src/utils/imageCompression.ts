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
