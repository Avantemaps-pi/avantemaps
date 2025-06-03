
import { FormValues } from '@/components/business/registration/formSchema';
import { geocodeAddress } from '@/utils/geocoding';
import { uploadBusinessImages } from './imageUploadService';
import { supabase } from '@/integrations/supabase/client';

interface SubmitBusinessParams {
  formValues: FormValues;
  userId: string;
  selectedImages: File[];
}

export const submitBusiness = async ({
  formValues,
  userId,
  selectedImages
}: SubmitBusinessParams) => {
  // Geocode the address
  const fullAddress = `${formValues.streetAddress}, ${formValues.state} ${formValues.zipCode}`;
  const coordinates = await geocodeAddress(fullAddress);

  // Prepare business data
  const businessData = {
    name: formValues.businessName,
    description: formValues.businessDescription,
    business_types: formValues.businessTypes,
    location: fullAddress,
    coordinates: coordinates ? `${coordinates.lat},${coordinates.lng}` : null,
    pi_wallet_address: formValues.piWalletAddress,
    owner_id: userId,
    contact_info: {
      firstName: formValues.firstName,
      lastName: formValues.lastName,
      phone: formValues.phone,
      email: formValues.email,
      website: formValues.website,
      address: {
        street: formValues.streetAddress,
        apartment: formValues.apartment,
        state: formValues.state,
        zipCode: formValues.zipCode
      }
    },
    hours: {
      monday: formValues.mondayClosed ? null : { open: formValues.mondayOpen, close: formValues.mondayClose },
      tuesday: formValues.tuesdayClosed ? null : { open: formValues.tuesdayOpen, close: formValues.tuesdayClose },
      wednesday: formValues.wednesdayClosed ? null : { open: formValues.wednesdayOpen, close: formValues.wednesdayClose },
      thursday: formValues.thursdayClosed ? null : { open: formValues.thursdayOpen, close: formValues.thursdayClose },
      friday: formValues.fridayClosed ? null : { open: formValues.fridayOpen, close: formValues.fridayClose },
      saturday: formValues.saturdayClosed ? null : { open: formValues.saturdayOpen, close: formValues.saturdayClose },
      sunday: formValues.sundayClosed ? null : { open: formValues.sundayOpen, close: formValues.sundayClose }
    }
  };

  // Insert business into database
  const { data, error } = await supabase
    .from('businesses')
    .insert([businessData])
    .select()
    .single();

  if (error) {
    console.error('Error submitting business:', error);
    throw new Error('Failed to submit business data');
  }

  // Upload images if business was created successfully
  if (data && selectedImages.length > 0) {
    await uploadBusinessImages(selectedImages, data.id.toString());
  }

  return { data, coordinates };
};
