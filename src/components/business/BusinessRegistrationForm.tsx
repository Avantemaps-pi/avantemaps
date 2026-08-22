import React from 'react';
import { Tabs } from '@/components/ui/tabs';
import { useIsMobile } from '@/hooks/use-mobile';
import { useBusinessRegistration } from '@/hooks/useBusinessRegistration';
import FormContainer from './registration/components/FormContainer';
import TabNavigation from './registration/components/TabNavigation';
import TabContent from './registration/components/TabContent';
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/auth';
import { toast } from 'sonner';
import { PiAuthButton } from './registration/PiAuthButton';
import { AddressVerificationDialog } from './registration/components/AddressVerificationDialog';
import { DuplicateWarningDialog } from './registration/components/DuplicateWarningDialog';
import type { SubmitErrorHandler } from 'react-hook-form';
import type { FormValues } from './registration/formSchema';

// Field-to-tab mapping, in the order tabs should be prioritized on invalid submit
const TAB_FIELDS: { tab: string; fields: (keyof FormValues)[] }[] = [
  { tab: 'business-owner', fields: ['firstName', 'lastName', 'businessName'] },
  { tab: 'details', fields: ['businessTypes', 'businessDescription', 'piWalletAddress'] },
  { tab: 'address', fields: ['streetAddress', 'apartment', 'city', 'state', 'zipCode', 'country'] },
  { tab: 'contact', fields: ['email', 'phone', 'website', 'countryCode'] },
  {
    tab: 'hours',
    fields: [
      'mondayOpen', 'mondayClose', 'mondayClosed',
      'tuesdayOpen', 'tuesdayClose', 'tuesdayClosed',
      'wednesdayOpen', 'wednesdayClose', 'wednesdayClosed',
      'thursdayOpen', 'thursdayClose', 'thursdayClosed',
      'fridayOpen', 'fridayClose', 'fridayClosed',
      'saturdayOpen', 'saturdayClose', 'saturdayClosed',
      'sundayOpen', 'sundayClose', 'sundayClosed',
    ],
  },
];

interface BusinessRegistrationFormProps {
  onSuccess?: () => void;
  onFormChange?: (hasChanges: boolean) => void;
}


const BusinessRegistrationForm = ({ onSuccess, onFormChange }: BusinessRegistrationFormProps) => {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { 
    form, 
    imageUpload,
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
  } = useBusinessRegistration(onSuccess);
  const [selectedTab, setSelectedTab] = React.useState('business-owner');

  React.useEffect(() => {
    const businessCount = user?.businessCount || 0;
    if (businessCount > 0 && user?.subscriptionTier === 'individual') {
      toast.error("Upgrade Required", {
        description: "Multiple business registrations require a Business subscription. Please upgrade to continue.",
        action: { label: "Upgrade Now", onClick: () => navigate('/pricing') }
      });
      navigate('/registered-business');
    }
  }, [user, navigate]);

  // Track form changes
  React.useEffect(() => {
    if (onFormChange) {
      onFormChange(form.formState.isDirty || imageUpload.hasImages);
    }
  }, [form.formState.isDirty, imageUpload.hasImages, onFormChange]);

  // On invalid submit: jump to the earliest tab containing an error and focus the field
  const handleInvalid: SubmitErrorHandler<FormValues> = React.useCallback((errors) => {
    for (const { tab, fields } of TAB_FIELDS) {
      const field = fields.find((f) => errors[f]);
      if (field) {
        setSelectedTab(tab);
        toast.error('Please fix the highlighted field');
        // Wait for the tab content to mount before focusing
        requestAnimationFrame(() => form.setFocus(field));
        return;
      }
    }
    toast.error('Please fix the highlighted field');
  }, [form]);

  // ✅ Require Pi auth before showing the form
  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <h2 className="text-lg font-semibold mb-2">Sign in with Pi Network</h2>
        <p className="text-muted-foreground mb-6 text-center max-w-md">
          Please sign in with your Pi Network account before registering a business.
        </p>
        <PiAuthButton />
      </div>
    );
  }

  return (
    <div className="w-full py-2 min-h-[600px]">
      <div className="mb-6 md:mb-8 px-4 md:px-6">
        <p className="text-muted-foreground text-lg mt-2">
          List your business on Avante Maps.
        </p>
      </div>

      <FormContainer form={form} onSubmit={onSubmit} onInvalid={handleInvalid} isSubmitting={isSubmitting}>
        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
          <TabNavigation isMobile={isMobile} disabled={isSubmitting} />
          <TabContent
            images={imageUpload.images}
            onAddImage={imageUpload.addImage}
            onAddCroppedImage={imageUpload.addCroppedImage}
            onRemoveImage={imageUpload.removeImage}
            onRetryImage={imageUpload.retryImage}
            isProcessing={imageUpload.isProcessing}
            setSelectedTab={setSelectedTab}
            isSubmitting={isSubmitting}
          />
        </Tabs>
      </FormContainer>

      {isSubmitting && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-card p-6 rounded-lg shadow-lg flex flex-col items-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-lg font-medium">Registering your business...</p>
          </div>
        </div>
      )}

      <AddressVerificationDialog
        open={showAddressVerification}
        address={verifiedAddress}
        onConfirm={handleAddressConfirmed}
        onCancel={() => setShowAddressVerification(false)}
      />

      <DuplicateWarningDialog
        open={showDuplicateWarning}
        similarBusinesses={similarBusinesses}
        onConfirm={handleDuplicateConfirmed}
        onCancel={() => setShowDuplicateWarning(false)}
      />
    </div>
  );
};

export default BusinessRegistrationForm;
