
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

interface BusinessRegistrationFormProps {
  onSuccess?: () => void;
}

const BusinessRegistrationForm = ({ onSuccess }: BusinessRegistrationFormProps) => {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { 
    form, 
    selectedImages, 
    handleImageUpload, 
    handleImageRemove,
    onSubmit, 
    isSubmitting,
  } = useBusinessRegistration(onSuccess);
  const [selectedTab, setSelectedTab] = React.useState('business-owner');

  // Check if user is able to register more businesses based on subscription
  React.useEffect(() => {
    // This is a placeholder - the actual businessCount check should come from 
    // the useBusinessRegistration hook or another source
    const businessCount = user?.businessCount || 0;
    
    if (businessCount > 0 && user?.subscriptionTier === 'individual') {
      toast.error(
        "Upgrade Required", 
        {
          description: "Multiple business registrations require a Business subscription. Please upgrade to continue.",
          action: {
            label: "Upgrade Now",
            onClick: () => navigate('/pricing')
          }
        }
      );
      navigate('/registered-business');
    }
  }, [user, navigate]);

  return (
    <div className="w-full py-2 min-h-[600px]">
      <div className="mb-6 md:mb-8">
        <h2 className="text-3xl font-bold tracking-tight">Register Business</h2>
        <p className="text-muted-foreground text-lg mt-2">
          List your business on Avante Maps.
        </p>
      </div>

      <FormContainer form={form} onSubmit={onSubmit} isSubmitting={isSubmitting}>
        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
          <TabNavigation 
            isMobile={isMobile} 
            value={selectedTab} 
            onValueChange={setSelectedTab} 
            disabled={isSubmitting}
          />

          <TabContent
            selectedImages={selectedImages}
            handleImageUpload={handleImageUpload}
            handleImageRemove={handleImageRemove}
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
    </div>
  );
};

export default BusinessRegistrationForm;
