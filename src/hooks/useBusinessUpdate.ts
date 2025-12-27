import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/context/auth';
import { containsInappropriateContent } from '@/utils/contentFilter';
import { useImageUpload } from '@/hooks/useImageUpload';
import { FormValues } from '@/components/business/registration/formSchema';
import { Business } from '@/types/business';

export const useBusinessUpdate = (business: Business, onSuccess?: () => void) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [removedExistingImages, setRemovedExistingImages] = useState<number[]>([]);
  const { user } = useAuth();
  const navigate = useNavigate();

  // Use the image upload hook
  const imageUpload = useImageUpload({ maxImages: 3, bucketName: 'business-images' });

  // Get existing images that haven't been removed
  const existingImages = business.images || [];
  const activeExistingImages = existingImages.filter((_, i) => !removedExistingImages.includes(i));

  // Handle removing an existing image
  const removeExistingImage = useCallback((index: number) => {
    setRemovedExistingImages(prev => [...prev, index]);
  }, []);

  // Check if there are any changes (new images or removed images)
  const hasImageChanges = imageUpload.hasImages || removedExistingImages.length > 0;

  const onSubmit = async (values: FormValues) => {
    try {
      if (!user?.uid) {
        toast.error('You must be logged in to update a business.');
        return;
      }

      setIsSubmitting(true);

      // Validate content
      if (containsInappropriateContent(values.businessName)) {
        toast.error('Business name contains inappropriate content.');
        setIsSubmitting(false);
        return;
      }
      if (values.businessDescription && containsInappropriateContent(values.businessDescription)) {
        toast.error('Business description contains inappropriate content.');
        setIsSubmitting(false);
        return;
      }

      // Build update payload
      const updatePayload: Record<string, any> = {
        business_name: values.businessName,
        business_description: values.businessDescription || null,
        business_types: values.businessTypes,
        pi_wallet_address: values.piWalletAddress || null,
        contact_info: {
          email: values.email,
          phone: values.phone ? `${values.countryCode || ''}${values.phone}` : null,
          website: values.website || null,
        },
        hours: {
          monday: { open: values.mondayOpen, close: values.mondayClose, closed: values.mondayClosed },
          tuesday: { open: values.tuesdayOpen, close: values.tuesdayClose, closed: values.tuesdayClosed },
          wednesday: { open: values.wednesdayOpen, close: values.wednesdayClose, closed: values.wednesdayClosed },
          thursday: { open: values.thursdayOpen, close: values.thursdayClose, closed: values.thursdayClosed },
          friday: { open: values.fridayOpen, close: values.fridayClose, closed: values.fridayClosed },
          saturday: { open: values.saturdayOpen, close: values.saturdayClose, closed: values.saturdayClosed },
          sunday: { open: values.sundayOpen, close: values.sundayClose, closed: values.sundayClosed },
        },
      };

      // Handle new image uploads if any
      let newImageUrls: string[] = [];
      if (imageUpload.hasImages) {
        toast.info('Uploading images...');
        const uploadResult = await imageUpload.uploadImages(business.id);
        
        if (uploadResult.successfulUrls.length > 0) {
          newImageUrls = uploadResult.successfulUrls;
        }

        if (uploadResult.failedCount > 0) {
          toast.warning(`${uploadResult.failedCount} image(s) failed to upload`);
        }
      }

      // Combine active existing images and new images (max 3 total)
      const combinedImages = [...activeExistingImages, ...newImageUrls].slice(0, 3);
      
      // Always update images if there are any changes
      if (hasImageChanges || newImageUrls.length > 0) {
        updatePayload.images = combinedImages.length > 0 ? combinedImages : null;
      }

      // Update business in database
      const { error: updateError } = await supabase
        .from('businesses')
        .update(updatePayload)
        .eq('id', business.id)
        .eq('owner_id', user.uid); // Ensure user owns this business

      if (updateError) {
        console.error('Error updating business:', updateError);
        toast.error(`Failed to update business: ${updateError.message}`);
        setIsSubmitting(false);
        return;
      }

      console.log('✅ Business updated successfully:', business.id);
      toast.success('Business information updated successfully!');
      
      // Clear uploaded images and reset removed images
      imageUpload.clearImages();
      setRemovedExistingImages([]);
      
      if (onSuccess) {
        onSuccess();
      } else {
        navigate('/registered-business');
      }
    } catch (error: any) {
      console.error('Update error:', error);
      toast.error(error?.message || 'An error occurred while updating your business.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    imageUpload,
    existingImages,
    activeExistingImages,
    removeExistingImage,
    hasImageChanges,
    onSubmit,
    isSubmitting,
  };
};
