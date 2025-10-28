import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { formSchema, FormValues } from '@/components/business/registration/formSchema';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/context/auth';
import { containsInappropriateContent } from '@/utils/contentFilter';

export const useBusinessRegistration = (onSuccess?: () => void) => {
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      businessName: '',
      phone: '',
      email: '',
      website: '',
      streetAddress: '',
      apartment: '',
      city: '',
      state: '',
      zipCode: '',
      country: '',
      businessTypes: [],
      businessDescription: '',
      piWalletAddress: user?.walletAddress || '',
      mondayOpen: '09:00',
      mondayClose: '17:00',
      mondayClosed: false,
      tuesdayOpen: '09:00',
      tuesdayClose: '17:00',
      tuesdayClosed: false,
      wednesdayOpen: '09:00',
      wednesdayClose: '17:00',
      wednesdayClosed: false,
      thursdayOpen: '09:00',
      thursdayClose: '17:00',
      thursdayClosed: false,
      fridayOpen: '09:00',
      fridayClose: '17:00',
      fridayClosed: false,
      saturdayOpen: '10:00',
      saturdayClose: '16:00',
      saturdayClosed: false,
      sundayOpen: '10:00',
      sundayClose: '16:00', 
      sundayClosed: false,
    },
  });

  // ---------------------------
  // IMAGE HANDLERS
  // ---------------------------
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const newImage = e.target.files[0];
      setSelectedImages(prev => [...prev, newImage].slice(0, 3));
    }
  };

  const handleImageRemove = (index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
  };

  // ---------------------------
  // GEOCODE ADDRESS FUNCTION
  // ---------------------------
  const geocodeAddress = async (address: string): Promise<{
    lat: number;
    lng: number;
    address_components?: {
      house_number: string;
      road: string;
      city: string;
      state: string;
      postcode: string;
      country: string;
    };
  } | null> => {
    try {
      const { data, error } = await supabase.functions.invoke('geocode-address', {
        body: { address }
      });

      if (error) {
        console.error('Error geocoding address:', error);
        return null;
      }

      if (data?.suggestions?.length > 0) {
        const firstResult = data.suggestions[0];
        return {
          lat: firstResult.lat,
          lng: firstResult.lon,
          address_components: firstResult.address
        };
      }

      return null;
    } catch (error) {
      console.error('Error geocoding address:', error);
      return null;
    }
  };

  // ---------------------------
  // FORM SUBMISSION HANDLER
  // ---------------------------
  const onSubmit = async (values: FormValues) => {
    try {
      if (!user?.uid) {
        toast.error('You must be logged in to register a business.');
        return;
      }

      setIsSubmitting(true);

      // ✅ Check if user profile exists
      const { data: existingUser, error: userCheckError } = await supabase
        .from('users')
        .select('id')
        .eq('id', user.uid)
        .maybeSingle();

      if (userCheckError) {
        console.error('Error checking user existence:', userCheckError);
        toast.error('Unable to verify account. Please ensure you\'re properly logged in.');
        return;
      }

      // ✅ Create profile if missing
      if (!existingUser) {
        try {
          const { error: upsertError } = await supabase.rpc('upsert_user_profile', {
            p_user_id: user.uid,
            p_username: user.username,
            p_subscription: user.subscriptionTier || 'individual'
          });

          if (upsertError) console.warn('User profile upsert failed:', upsertError);
        } catch (err) {
          console.warn('RPC error, proceeding anyway:', err);
        }

        // Verify creation
        const { data: verifyUser, error: verifyError } = await supabase
          .from('users')
          .select('id')
          .eq('id', user.uid)
          .maybeSingle();

        if (verifyError || !verifyUser) {
          console.error('User creation verification failed:', verifyError);
          toast.error('Account setup incomplete. Please log out and log back in.');
          return;
        }

        toast.success('Account setup completed successfully!');
      }

      // ✅ Validate input content
      if (containsInappropriateContent(values.businessName)) {
        toast.error('Business name contains inappropriate or suspicious content.');
        return;
      }
      if (values.businessDescription && containsInappropriateContent(values.businessDescription)) {
        toast.error('Business description contains inappropriate content.');
        return;
      }
      if (values.website && containsInappropriateContent(values.website)) {
        toast.error('Website URL contains suspicious patterns.');
        return;
      }

      // ✅ Build address and geocode it
      const fullAddress = `${values.streetAddress}${values.apartment ? `, ${values.apartment}` : ''}, ${values.city}, ${values.state}, ${values.zipCode}, ${values.country}`;
      const geocodedData = await geocodeAddress(fullAddress);

      if (!geocodedData?.lat || !geocodedData?.lng) {
        toast.error('Could not locate address. Please check and try again.');
        return;
      }

      // ✅ Prepare business payload
      const businessData = {
        name: values.businessName,
        owner_id: user.uid,
        location: fullAddress,
        description: values.businessDescription,
        category: values.businessTypes[0] || 'Other',
        coordinates: JSON.stringify({ lat: geocodedData.lat, lng: geocodedData.lng }),
        street_address: values.streetAddress,
        city: values.city,
        state: values.state,
        postal_code: values.zipCode,
        country: values.country,
        contact_info: {
          phone: values.phone,
          email: values.email,
          website: values.website,
          owner_first_name: values.firstName,
          owner_last_name: values.lastName,
        },
        hours: {
          monday: values.mondayClosed ? 'Closed' : `${values.mondayOpen}-${values.mondayClose}`,
          tuesday: values.tuesdayClosed ? 'Closed' : `${values.tuesdayOpen}-${values.tuesdayClose}`,
          wednesday: values.wednesdayClosed ? 'Closed' : `${values.wednesdayOpen}-${values.wednesdayClose}`,
          thursday: values.thursdayClosed ? 'Closed' : `${values.thursdayOpen}-${values.thursdayClose}`,
          friday: values.fridayClosed ? 'Closed' : `${values.fridayOpen}-${values.fridayClose}`,
          saturday: values.saturdayClosed ? 'Closed' : `${values.saturdayOpen}-${values.saturdayClose}`,
          sunday: values.sundayClosed ? 'Closed' : `${values.sundayOpen}-${values.sundayClose}`,
        },
        business_types: values.businessTypes,
        pi_wallet_address: values.piWalletAddress,
        keywords: [...values.businessTypes, ...values.businessName.split(/\s+/)],
      };

      console.log('Submitting business data:', businessData);

      // ✅ Insert business data
      const { data, error } = await supabase
        .from('businesses')
        .insert(businessData)
        .select();

      if (error || !data?.length) {
        console.error('Error submitting business data:', error);
        toast.error(`Failed to register business: ${error?.message || 'Unknown error'}`);
        return;
      }

      const createdBusiness = data[0];
      console.log('Business registered successfully:', createdBusiness);

      // ✅ Handle image uploads in parallel
      if (selectedImages.length > 0 && createdBusiness?.id) {
        try {
          const uploadPromises = selectedImages.map(async (image, index) => {
            const filePath = `businesses/${createdBusiness.id}/${Date.now()}-${image.name}`;
            const { error: uploadError } = await supabase.storage
              .from('business-images')
              .upload(filePath, image);

            if (uploadError) {
              console.error(`Error uploading image ${index + 1}:`, uploadError);
              toast.warning(`Image ${index + 1} upload failed.`);
              return null;
            }

            const { data: publicUrl } = supabase
              .storage
              .from('business-images')
              .getPublicUrl(filePath);

            return publicUrl?.publicUrl || null;
          });

          const urls = (await Promise.all(uploadPromises)).filter(Boolean) as string[];
          if (urls.length > 0) {
            await supabase
              .from('businesses')
              .update({ image_urls: urls })
              .eq('id', createdBusiness.id);
          }
        } catch (uploadErr) {
          console.error('Image upload error:', uploadErr);
        }
      }

      toast.success('Business registration submitted successfully!');

      if (onSuccess) onSuccess();

      // ✅ Navigate with context data
      navigate('/', {
        state: {
          newBusiness: true,
          businessData: {
            ...createdBusiness,
            position: { lat: geocodedData.lat, lng: geocodedData.lng },
          },
        },
      });

    } catch (error) {
      console.error('Registration error:', error);
      toast.error('Failed to register business. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    form,
    selectedImages,
    handleImageUpload,
    handleImageRemove,
    onSubmit,
    isSubmitting,
  };
};
