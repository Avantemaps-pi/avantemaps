import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { formSchema, FormValues } from '@/components/business/registration/formSchema';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/context/auth';

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

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const newImage = e.target.files[0];
      setSelectedImages(prev => {
        const updatedImages = [...prev, newImage].slice(0, 3);
        return updatedImages;
      });
    }
  };

  const handleImageRemove = (index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
  };

  const geocodeAddress = async (address: string): Promise<google.maps.LatLngLiteral | null> => {
    try {
      // Use our LocationIQ edge function for geocoding
      const { data, error } = await supabase.functions.invoke('geocode-address', {
        body: { address }
      });

      if (error) {
        console.error('Error geocoding address:', error);
        return null;
      }

      if (data?.suggestions && data.suggestions.length > 0) {
        const firstResult = data.suggestions[0];
        return {
          lat: firstResult.lat,
          lng: firstResult.lon
        };
      }

      return null;
    } catch (error) {
      console.error('Error geocoding address:', error);
      return null;
    }
  };

  const onSubmit = async (values: FormValues) => {
    try {
      if (!user?.uid) {
        toast.error('You must be logged in to register a business.');
        return;
      }

      setIsSubmitting(true);

      // Create full address string including the new city and country fields
      const fullAddress = `${values.streetAddress}${values.apartment ? `, ${values.apartment}` : ''}, ${values.city}, ${values.state}, ${values.zipCode}, ${values.country}`;
      
      // Geocode the address
      const coordinates = await geocodeAddress(fullAddress);
      
      if (!coordinates) {
        toast.error('Could not locate address. Please check and try again.');
        setIsSubmitting(false);
        return;
      }
      
      // Prepare business data with all submitted information
      const businessData = {
        name: values.businessName,
        owner_id: user?.uid,
        location: fullAddress,
        description: values.businessDescription,
        category: values.businessTypes.length > 0 ? values.businessTypes[0] : 'Other',
        coordinates: JSON.stringify(coordinates),
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
        keywords: [...values.businessTypes, values.businessName.split(' ')].flat(),
      };
      
      console.log('Submitting business data:', businessData);
      
      // Insert business data into Supabase
      const { data, error } = await supabase
        .from('businesses')
        .insert(businessData)
        .select();
        
      if (error) {
        console.error('Error submitting business data:', error);
        toast.error(`Failed to register business: ${error.message}`);
        setIsSubmitting(false);
        return;
      }
      
      console.log('Business registered successfully:', data);

      // Handle image uploads if any
      if (selectedImages.length > 0 && data[0]?.id) {
        const businessId = data[0].id;
        
        // Check if business-images bucket exists
        const { data: buckets, error: bucketError } = await supabase
          .storage
          .listBuckets();
        
        const businessBucketExists = buckets?.some(bucket => bucket.name === 'business-images');
        
        if (businessBucketExists) {
          for (let i = 0; i < selectedImages.length; i++) {
            const image = selectedImages[i];
            const filePath = `businesses/${businessId}/${Date.now()}-${image.name}`;
            
            try {
              const { error: uploadError } = await supabase.storage
                .from('business-images')
                .upload(filePath, image);
                
              if (uploadError) {
                console.error(`Error uploading image ${i+1}:`, uploadError);
                toast.warning(`Business registered, but image ${i+1} upload failed.`);
              }
            } catch (uploadError) {
              console.error(`Error uploading image ${i+1}:`, uploadError);
            }
          }
        } else {
          console.warn('Business images bucket not found, skipping image upload');
          toast.warning("Business registered successfully, but image upload is not configured.");
        }
      }

      toast.success('Business registration submitted successfully!');
      
      if (onSuccess) onSuccess();
      
      // Navigate with business data
      if (coordinates) {
        navigate('/', { 
          state: { 
            newBusiness: true,
            businessData: {
              ...data[0],
              position: coordinates,
            }
          } 
        });
      } else {
        navigate('/');
      }
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
    isSubmitting
  };
};
