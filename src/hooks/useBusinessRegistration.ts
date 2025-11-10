import { useState, useEffect } from 'react';
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

  const [piWalletAddress, setPiWalletAddress] = useState(user?.walletAddress || '');

  useEffect(() => {
    // Update wallet address automatically if user logs in via Pi
    if (user?.walletAddress) setPiWalletAddress(user.walletAddress);
  }, [user]);

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
      piWalletAddress, // ✅ Automatically filled from Pi user
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
  // GEOCODE FUNCTION
  // ---------------------------
  const geocodeAddress = async (address: string) => {
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
        return { lat: firstResult.lat, lng: firstResult.lon, address_components: firstResult.address };
      }
      return null;
    } catch (err) {
      console.error('Geocode error:', err);
      return null;
    }
  };

  // ---------------------------
  // FORM SUBMISSION
  // ---------------------------
  const onSubmit = async (values: FormValues) => {
    try {
      if (!user?.uid) {
        toast.error('You must be logged in via Pi to register a business.');
        return;
      }

      // Check business count limit
      const { count: businessCount } = await supabase
        .from('businesses')
        .select('*', { count: 'exact', head: true })
        .eq('owner_id', user.uid);

      const BUSINESS_LIMITS: Record<string, number> = {
        'individual': 1,
        'small-business': 3,
        'organization': 5,
      };

      const limit = BUSINESS_LIMITS[user.subscriptionTier] || 1;
      const currentCount = businessCount || 0;

      if (currentCount >= limit) {
        toast.error(`Business limit reached`, {
          description: `Your ${user.subscriptionTier} plan allows up to ${limit} business${limit > 1 ? 'es' : ''}. Please upgrade to register more.`,
          action: { label: "Upgrade Now", onClick: () => navigate('/pricing') }
        });
        return;
      }

      setIsSubmitting(true);

      // Always use latest wallet address from Pi user
      values.piWalletAddress = piWalletAddress;

      // ✅ Validation of inappropriate content
      if (containsInappropriateContent(values.businessName)) {
        toast.error('Business name contains inappropriate content.');
        return;
      }
      if (values.businessDescription && containsInappropriateContent(values.businessDescription)) {
        toast.error('Business description contains inappropriate content.');
        return;
      }

      // ✅ Geocode address
      const fullAddress = `${values.streetAddress}${values.apartment ? `, ${values.apartment}` : ''}, ${values.city}, ${values.state}, ${values.zipCode}, ${values.country}`;
      const geocodedData = await geocodeAddress(fullAddress);
      if (!geocodedData?.lat || !geocodedData?.lng) {
        toast.error('Address could not be located.');
        return;
      }

      // ✅ Insert business via Edge Function (bypasses RLS with service role)
      const { data: insertRes, error: insertError } = await supabase.functions.invoke('insert-business', {
        body: {
          owner_id: user.uid,
          businessName: values.businessName,
          businessDescription: values.businessDescription,
          businessTypes: values.businessTypes,
          contact: {
            firstName: values.firstName,
            lastName: values.lastName,
            phone: values.phone,
            email: values.email,
            website: values.website,
          },
          address: {
            streetAddress: values.streetAddress,
            apartment: values.apartment,
            city: values.city,
            state: values.state,
            zipCode: values.zipCode,
            country: values.country,
            lat: parseFloat(String(geocodedData.lat)),
            lng: parseFloat(String(geocodedData.lng)),
          },
          piWalletAddress: values.piWalletAddress,
        },
      });

      if (insertError || !insertRes?.success || !insertRes?.business) {
        const errMsg = (insertError as any)?.message || (insertRes as any)?.error || 'Unknown error';
        toast.error(`Business registration failed: ${errMsg}`);
        return;
      }

      const newBusiness = insertRes.business;

      // ✅ Upload business images to storage
      if (selectedImages.length && newBusiness?.id) {
        try {
          const uploadPromises = selectedImages.map(async (file, index) => {
            const fileExt = file.name.split('.').pop();
            const filePath = `${newBusiness.id}/image-${index}-${Date.now()}.${fileExt}`;
            
            const { error: uploadError } = await supabase.storage
              .from('business-images')
              .upload(filePath, file, {
                cacheControl: '3600',
                upsert: false
              });
            
            if (uploadError) {
              console.error('Image upload error:', uploadError);
              return null;
            }
            return filePath;
          });

          const uploadedPaths = await Promise.all(uploadPromises);
          const successfulUploads = uploadedPaths.filter(path => path !== null);
          
          if (successfulUploads.length > 0) {
            console.log(`✅ Uploaded ${successfulUploads.length} images to storage`);
            toast.success(`Business registered with ${successfulUploads.length} image(s)!`);
          }
        } catch (imgErr) {
          console.error('Image upload process error:', imgErr);
          toast.warning('Business registered but some images failed to upload');
        }
      }

      toast.success('Business registered successfully!');
      if (onSuccess) onSuccess();

      // Navigate to registered-business page with the new business ID
      navigate('/registered-business', {
        state: { newBusinessId: newBusiness.id }
      });

    } catch (err) {
      console.error('Registration error:', err);
      toast.error('Failed to register business.');
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
