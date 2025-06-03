
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const uploadBusinessImages = async (
  selectedImages: File[], 
  businessId: string
): Promise<void> => {
  if (selectedImages.length === 0) return;

  // Check if the business-images bucket exists
  const { data: buckets, error: bucketError } = await supabase
    .storage
    .listBuckets();
  
  const businessBucketExists = buckets?.some(bucket => bucket.name === 'business-images');
  
  if (bucketError) {
    console.error('Error checking storage buckets:', bucketError);
  }

  if (!businessBucketExists) {
    toast.warning("Image upload failed: Storage not configured. Your business was registered without images.");
    return;
  }

  for (let i = 0; i < selectedImages.length; i++) {
    const image = selectedImages[i];
    const filePath = `businesses/${businessId}/${image.name}`;
    
    try {
      const { error: uploadError } = await supabase.storage
        .from('business-images')
        .upload(filePath, image);
        
      if (uploadError) {
        console.error(`Error uploading image ${i+1}:`, uploadError);
        toast.error(`Business registered, but image ${i+1} upload failed.`);
      }
    } catch (uploadError) {
      console.error(`Error uploading image ${i+1}:`, uploadError);
    }
  }
};
