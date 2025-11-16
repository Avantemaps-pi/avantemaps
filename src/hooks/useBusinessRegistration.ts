import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { formSchema, FormValues } from '@/components/business/registration/formSchema';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/context/auth';
import { containsInappropriateContent } from '@/utils/contentFilter';
import type { BusinessInsertPayload } from '@/types/businessPayload';

export const useBusinessRegistration = (onSuccess?: () => void) => {
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAddressVerification, setShowAddressVerification] = useState(false);
  const [verifiedAddress, setVerifiedAddress] = useState<any>(null);
  const [showDuplicateWarning, setShowDuplicateWarning] = useState(false);
  const [similarBusinesses, setSimilarBusinesses] = useState<any[]>([]);
  const [pendingSubmission, setPendingSubmission] = useState<any>(null);
  const { user } = useAuth();
  const navigate = useNavigate();

  const [piWalletAddress, setPiWalletAddress] = useState(user?.walletAddress || '');

  useEffect(() => {
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
      piWalletAddress,
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

  const handleImageReorder = (newImages: File[]) => {
    setSelectedImages(newImages);
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

      // ✅ Geocode address and verify
      const fullAddress = `${values.streetAddress}${values.apartment ? `, ${values.apartment}` : ''}, ${values.city}, ${values.state}, ${values.zipCode}, ${values.country}`;
      const geocodedData = await geocodeAddress(fullAddress);
      if (!geocodedData?.lat || !geocodedData?.lng) {
        toast.error('Address could not be located.');
        setIsSubmitting(false);
        return;
      }

      // Show address verification dialog
      const addressForVerification = {
        street: values.streetAddress,
        apartment: values.apartment,
        city: values.city,
        state: values.state,
        zipCode: values.zipCode,
        country: values.country,
        lat: geocodedData.lat,
        lng: geocodedData.lng,
      };
      
      setVerifiedAddress(addressForVerification);
      setPendingSubmission({ values, geocodedData });
      setShowAddressVerification(true);
      setIsSubmitting(false);
      return; // Wait for user confirmation
    } catch (error: any) {
      console.error('Error submitting business:', error);
      toast.error(error?.message || 'An error occurred while registering your business.');
      setIsSubmitting(false);
    }
  };

  const handleAddressConfirmed = async () => {
    setShowAddressVerification(false);
    if (!pendingSubmission) return;

    try {
      setIsSubmitting(true);
      const { values, geocodedData } = pendingSubmission;

      // ✅ Check for duplicate businesses
      const { data: existingBusinesses, error: duplicateError } = await supabase
        .from('businesses')
        .select('id, business_name, street_address, city, state')
        .ilike('business_name', values.businessName)
        .ilike('street_address', `%${values.streetAddress}%`)
        .limit(5);

      if (duplicateError) {
        console.error('Error checking duplicates:', duplicateError);
      }

      // If similar businesses found, show warning
      if (existingBusinesses && existingBusinesses.length > 0) {
        setSimilarBusinesses(existingBusinesses.map(b => ({
          id: b.id,
          name: b.business_name,
          address: b.street_address,
          city: b.city,
          state: b.state,
        })));
        setShowDuplicateWarning(true);
        setIsSubmitting(false);
        return; // Wait for user decision
      }

      // No duplicates, proceed with submission
      await finalizeSubmission(values, geocodedData);
    } catch (error: any) {
      console.error('Error during address confirmation:', error);
      toast.error(error?.message || 'An error occurred.');
      setIsSubmitting(false);
    }
  };

  const handleDuplicateConfirmed = async () => {
    setShowDuplicateWarning(false);
    if (!pendingSubmission) return;

    try {
      setIsSubmitting(true);
      const { values, geocodedData } = pendingSubmission;
      await finalizeSubmission(values, geocodedData);
    } catch (error: any) {
      console.error('Error during duplicate confirmation:', error);
      toast.error(error?.message || 'An error occurred.');
      setIsSubmitting(false);
    }
  };

  const finalizeSubmission = async (values: FormValues, geocodedData: any) => {
    try {

      // ---------------------------
      // BUILD TYPED PAYLOAD
      // ---------------------------
      const payload: BusinessInsertPayload = {
        user_id: user.uid,
        subscription: user.subscriptionTier,
        business_name: values.businessName,
        business_description: values.businessDescription,
        business_types: values.businessTypes,
        contact_email: values.email,
        phone_number: `${values.countryCode}${values.phone}`,
        website: values.website || null,
        pi_wallet_address: values.piWalletAddress,
        address: {
          street: values.streetAddress,
          apartment: values.apartment || null,
          city: values.city,
          state: values.state,
          zip_code: values.zipCode,
          country: values.country,
          lat: geocodedData.lat,
          lng: geocodedData.lng,
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
        owner: {
          first_name: values.firstName,
          last_name: values.lastName,
        },
      };

      // ✅ Insert business via Edge Function
      const { data: insertRes, error: insertError } = await supabase.functions.invoke('insert-business', { body: payload });

      if (insertError || !insertRes?.success || !insertRes?.business) {
        const errMsg = (insertError as any)?.message || (insertRes as any)?.error || 'Unknown error';
        toast.error(`Business registration failed: ${errMsg}`);
        return;
      }

      const newBusiness = insertRes.business;

      // ---------------------------
      // UPLOAD BUSINESS IMAGES
      // ---------------------------
      if (selectedImages.length && newBusiness?.id) {
        try {
          const uploadPromises = selectedImages.map(async (file, index) => {
            const fileExt = file.name.split('.').pop();
            const filePath = `${newBusiness.id}/image-${index}-${Date.now()}.${fileExt}`;

            const { error: uploadError } = await supabase.storage
              .from('business-images')
              .upload(filePath, file, { cacheControl: '3600', upsert: false });

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
    handleImageReorder,
    onSubmit,
    isSubmitting,
    showAddressVerification,
    verifiedAddress,
    handleAddressConfirmed,
    setShowAddressVerification,
    showDuplicateWarning,
    similarBusinesses,
    handleDuplicateConfirmed,
    setShowDuplicateWarning,
  };
};
