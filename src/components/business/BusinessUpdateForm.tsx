
import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { FormProvider } from 'react-hook-form';
import { Form } from '@/components/ui/form';
import { Tabs } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { useIsMobile } from '@/hooks/use-mobile';
import { useNavigate } from 'react-router-dom';
import { Business } from '@/types/business';
import { FormValues } from './registration/formSchema';
import { useBusinessFormInit } from '@/hooks/useBusinessFormInit';
import FormHeader from './registration/components/FormHeader';
import TabNavigation from './registration/components/TabNavigation';
import TabContent from './registration/components/TabContent';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface BusinessUpdateFormProps {
  business: Business;
  onSuccess?: () => void;
}

export interface BusinessUpdateFormRef {
  checkAndHandleBackNavigation: () => void;
}

export const BusinessUpdateForm = forwardRef<BusinessUpdateFormRef, BusinessUpdateFormProps>(
  ({ business, onSuccess }, ref) => {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const [selectedTab, setSelectedTab] = useState('business-owner');
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [showUnsavedChangesDialog, setShowUnsavedChangesDialog] = useState(false);
  const form = useBusinessFormInit(business);

  // Track if form has unsaved changes
  const hasUnsavedChanges = form.formState.isDirty || selectedImages.length > 0;

  // Listen for navigation attempts (back button in header)
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  // Override browser back button
  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        setShowUnsavedChangesDialog(true);
        window.history.pushState(null, '', window.location.pathname);
      }
    };

    if (hasUnsavedChanges) {
      window.history.pushState(null, '', window.location.pathname);
      window.addEventListener('popstate', handlePopState);
    }

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [hasUnsavedChanges]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const newImage = e.target.files[0];
      setSelectedImages(prev => [...prev, newImage].slice(0, 3));
    }
  };

  const handleImageRemove = (index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
  };

  const onSubmit = (values: FormValues) => {
    console.log('Updated form values:', values);
    console.log('Selected images:', selectedImages);
    
    toast.success('Business information updated successfully!');
    form.reset(values); // Reset form state to mark as clean
    setSelectedImages([]); // Clear images
    if (onSuccess) onSuccess();
  };

  const handleDiscardChanges = () => {
    // Reset form to clear dirty state
    form.reset();
    // Clear selected images
    setSelectedImages([]);
    // Close dialog
    setShowUnsavedChangesDialog(false);
    // Navigate back immediately
    navigate(-1);
  };

  // Expose method to parent via ref
  useImperativeHandle(ref, () => ({
    checkAndHandleBackNavigation: () => {
      if (hasUnsavedChanges) {
        setShowUnsavedChangesDialog(true);
      } else {
        navigate(-1);
      }
    }
  }));

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

      <AlertDialog open={showUnsavedChangesDialog} onOpenChange={setShowUnsavedChangesDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unsaved Changes</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes. Do you want to save them before leaving?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleDiscardChanges}>
              Don't Save
            </AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              setShowUnsavedChangesDialog(false);
              form.handleSubmit(onSubmit)();
            }}>
              Save Changes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
});