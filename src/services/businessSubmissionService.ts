
import { supabase } from '@/integrations/supabase/client';
import { FormValues } from '@/components/business/registration/formSchema';
import { geocodeAddress } from '@/utils/geocoding';
import { uploadBusinessImages } from './imageUploadService';
import { toast } from 'sonner';

export interface BusinessSubmissionData {
  formValues: FormValues;
  userId: string;
  selectedImages: File[];
}

export const submitBusiness = async ({
  formValues,
  userId,
  selectedImages
}: BusinessSubmissionData) => {
  const fullAddress = `${formValues.streetAddress}, ${formValues.state}, ${formValues.zipCode}`;
  const coordinates = await geocodeAddress(fullAddress);
  
  if (!coordinates) {
    toast.error('Could not locate address. Please check and try again.');
    throw new Error('Geocoding failed');
  }
  
  const businessData = {
    name: formValues.businessName,
    owner_id: userId,
    location: fullAddress,
    description: formValues.businessDescription,
    category: formValues.businessTypes.length > 0 ? formValues.businessTypes[0] : 'Other',
    coordinates: JSON.stringify(coordinates),
    contact_info: {
      phone: formValues.phone,
      email: formValues.email,
      website: formValues.website,
    },
    hours: {
      monday: formValues.mondayClosed ? 'Closed' : `${formValues.mondayOpen}-${formValues.mondayClose}`,
      tuesday: formValues.tuesdayClosed ? 'Closed' : `${formValues.tuesdayOpen}-${formValues.tuesdayClose}`,
      wednesday: formValues.wednesdayClosed ? 'Closed' : `${formValues.wednesdayOpen}-${formValues.wednesdayClose}`,
      thursday: formValues.thursdayClosed ? 'Closed' : `${formValues.thursdayOpen}-${formValues.thursdayClose}`,
      friday: formValues.fridayClosed ? 'Closed' : `${formValues.fridayOpen}-${formValues.fridayClose}`,
      saturday: formValues.saturdayClosed ? 'Closed' : `${formValues.saturdayOpen}-${formValues.saturdayClose}`,
      sunday: formValues.sundayClosed ? 'Closed' : `${formValues.sundayOpen}-${formValues.sundayClose}`,
    },
    business_types: formValues.businessTypes,
    pi_wallet_address: formValues.piWalletAddress,
    keywords: [...formValues.businessTypes, formValues.businessName.split(' ')].flat(),
  };
  
  const { data, error } = await supabase
    .from('businesses')
    .insert(businessData)
    .select();
    
  if (error) {
    console.error('Error submitting business data:', error);
    toast.error(`Failed to register business: ${error.message}`);
    throw error;
  }

  // Upload images if business was created successfully
  if (data?.[0]?.id) {
    await uploadBusinessImages(selectedImages, data[0].id);
  }

  return { data: data[0], coordinates };
};
