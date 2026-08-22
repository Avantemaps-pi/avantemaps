
import React, { useEffect, useState, useRef } from 'react';
import { useLocation, useNavigate } from '@/lib/router-compat';
import { Loader2 } from 'lucide-react';
import { motion } from '@/components/ui/motion';
import { useIsMobile } from '@/hooks/use-mobile';
import { BusinessUpdateForm, BusinessUpdateFormRef } from '@/components/business/BusinessUpdateForm';
import { Business } from '@/types/business';
import { toast } from 'sonner';
import AppLayout from '@/components/layout/AppLayout';

const UpdateRegistration = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [isLoading, setIsLoading] = useState(true);
  const [business, setBusiness] = useState<Business | null>(null);
  const businessUpdateFormRef = useRef<BusinessUpdateFormRef>(null);
  
  useEffect(() => {
    // Check if we have business data in the location state
    const state = location.state as { business?: Business } | null;
    if (state?.business) {
      setBusiness(state.business);
      setIsLoading(false);
    } else {
      // No business data provided - show error
      setIsLoading(false);
      toast.error('No business data found. Please select a business to edit.');
    }
  }, [location]);

  const handleGoBack = () => {
    if (businessUpdateFormRef.current) {
      businessUpdateFormRef.current.checkAndHandleBackNavigation();
    } else {
      navigate('/registered-business');
    }
  };

  const handleSuccess = () => {
    toast.success('Business information updated successfully!');
    navigate('/registered-business');
  };
  
  return (
    <AppLayout 
      title="Update Business" 
      backButton={true}
      onBackClick={handleGoBack}
      className="prevent-overflow"
    >
      <motion.div 
        className="w-full max-w-5xl mx-auto"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        skipMobileAnimations={isMobile}
      >
        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">Loading business information...</span>
          </div>
        ) : business ? (
          <BusinessUpdateForm 
            ref={businessUpdateFormRef}
            business={business} 
            onSuccess={handleSuccess}
          />
        ) : (
          <div className="bg-destructive/10 text-destructive p-4 rounded-md">
            Failed to load business information. Please try again.
          </div>
        )}
      </motion.div>
    </AppLayout>
  );
};

export default UpdateRegistration;
