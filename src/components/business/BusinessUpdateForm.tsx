
import React, { useState } from 'react';
import { FormProvider } from 'react-hook-form';
import { Form } from '@/components/ui/form';
import { Tabs } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { useIsMobile } from '@/hooks/use-mobile';
import { Business } from '@/types/business';
import { FormValues } from './registration/formSchema';
import { useBusinessFormInit } from '@/hooks/useBusinessFormInit';
import FormHeader from './registration/components/FormHeader';
import TabNavigation from './registration/components/TabNavigation';
import TabContent from './registration/components/TabContent';

interface BusinessUpdateFormProps {
  business: Business;
  onSuccess?: () => void;
}

export const BusinessUpdateForm = ({ business, onSuccess }: BusinessUpdateFormProps) => {
  const isMobile = useIsMobile();
  const [selectedTab, setSelectedTab] = useState('business-owner');
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const form = useBusinessFormInit(business);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const newImage = e.target.files[0];
      setSelectedImages(prev => [...prev, newImage].slice(0, 3)); // Keep only up to 3 images
    }
  };

  const handleImageRemove = (index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
  };

  const onSubmit = (values: FormValues) => {
    // In a real app, this would send the form data along with the image to a backend service
    console.log('Updated form values:', values);
    console.log('Selected images:', selectedImages);
    
    toast.success('Business information updated successfully!');
    if (onSuccess) onSuccess();
  };

  return (
    <div className="w-full py-2">
      <FormHeader 
        title="Update Information"
        description="Make changes to your business listing on Avante Maps."
      />

      <FormProvider {...form}>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 w-full">
            <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
              <TabNavigation 
                isMobile={isMobile} 
              />
              <TabContent 
                selectedImages={selectedImages}
                handleImageUpload={handleImageUpload}
                handleImageRemove={handleImageRemove}
                setSelectedTab={setSelectedTab}
              />
            </Tabs>
          </form>
        </Form>
      </FormProvider>
    </div>
  );
};
