
import { useState } from 'react';
import { FormValues } from '@/components/business/registration/formSchema';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '@/context/auth';
import { useBusinessForm } from './useBusinessForm';
import { useImageUpload } from './useImageUpload';
import { submitBusiness } from '@/services/businessSubmissionService';

export const useBusinessRegistration = (onSuccess?: () => void) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const form = useBusinessForm();
  const { selectedImages, handleImageUpload, handleImageRemove } = useImageUpload();

  const onSubmit = async (values: FormValues) => {
    try {
      if (!user?.uid) {
        toast.error('You must be logged in to register a business.');
        return;
      }

      setIsSubmitting(true);

      const { data, coordinates } = await submitBusiness({
        formValues: values,
        userId: user.uid,
        selectedImages
      });

      toast.success('Business registration submitted successfully!');
      
      if (onSuccess) onSuccess();
      
      if (coordinates) {
        navigate('/', { 
          state: { 
            newBusiness: true,
            businessData: {
              ...data,
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
