
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '@/components/layout/AppLayout';
import BusinessRegistrationForm from '@/components/business/BusinessRegistrationForm';
import { motion } from '@/components/ui/motion';
import { useIsMobile } from '@/hooks/use-mobile';
import { useAuth } from '@/context/auth';
import LoginDialog from '@/components/auth/LoginDialog';
import { toast } from 'sonner';
import MetaTags from '@/components/seo/MetaTags';
import { UnsavedChangesDialog } from '@/components/business/registration/UnsavedChangesDialog';

const Registration = () => {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [showLoginDialog, setShowLoginDialog] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<(() => void) | null>(null);
  
  // Check if user is authenticated when the component mounts
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      setShowLoginDialog(true);
    }
  }, [isAuthenticated, authLoading]);

  const handleLoginDialogClose = (open: boolean) => {
    setShowLoginDialog(open);
    if (!open && !isAuthenticated) {
      toast.error("You must be logged in to register a business");
      // If the dialog is closed and the user is still not authenticated, navigate back
      navigate('/');
    }
  };

  const handleFormSuccess = () => {
    // Navigation is now handled in useBusinessRegistration hook
    // No need to navigate here as the hook redirects to /registered-business
    setHasUnsavedChanges(false); // Clear unsaved changes flag on success
  };

  // Prevent navigation via browser back button when there are unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [hasUnsavedChanges]);

  const handleBackClick = () => {
    if (hasUnsavedChanges) {
      setPendingNavigation(() => () => navigate(-1));
      setShowUnsavedDialog(true);
    } else {
      navigate(-1);
    }
  };

  const handleConfirmLeave = () => {
    setShowUnsavedDialog(false);
    setHasUnsavedChanges(false);
    if (pendingNavigation) {
      pendingNavigation();
      setPendingNavigation(null);
    }
  };
  
  return (
    <AppLayout 
      title="Register Business"
      fullHeight={false} 
      fullWidth={true}
      hideSidebar={true}
      onBackClick={handleBackClick}
    >
      <MetaTags
        title="Register Your Business"
        description="Register your business on Avante Maps and reach customers in your area. Accept Pi Network payments and grow your presence."
        keywords={['business registration', 'register business', 'pi network business', 'list my business', 'add business']}
        ogType="website"
        ogTitle="Register Your Business on Avante Maps"
        ogDescription="Join the Pi Network business community and reach local customers"
        ogImage={{
          url: `${window.location.origin}/og-image.png`,
          width: 1200,
          height: 630,
          alt: 'Register Your Business - Avante Maps'
        }}
        twitter={{
          card: 'summary_large_image',
          title: 'Register Your Business - Avante Maps',
          description: 'Join the Pi Network business community'
        }}
        structuredData={{
          '@context': 'https://schema.org',
          '@type': 'Service',
          'name': 'Business Registration - Avante Maps',
          'description': 'Register your business on Avante Maps platform',
          'provider': {
            '@type': 'Organization',
            'name': 'Avante Maps'
          }
        }}
      />
      <motion.div 
        className="w-full py-2 md:py-6 overflow-visible form-container"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        skipMobileAnimations={isMobile}
      >
        <BusinessRegistrationForm 
          onSuccess={handleFormSuccess}
          onFormChange={setHasUnsavedChanges}
        />
      </motion.div>
      
      {/* Login Dialog */}
      <LoginDialog open={showLoginDialog} onOpenChange={handleLoginDialogClose} />
      
      {/* Unsaved Changes Dialog */}
      <UnsavedChangesDialog
        open={showUnsavedDialog}
        onOpenChange={setShowUnsavedDialog}
        onConfirm={handleConfirmLeave}
      />
    </AppLayout>
  );
};

export default Registration;
