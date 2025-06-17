
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '@/components/layout/AppLayout';
import BusinessRegistrationForm from '@/components/business/BusinessRegistrationForm';
import { motion } from '@/components/ui/motion';
import { useIsMobile } from '@/hooks/use-mobile';
import { useAuth } from '@/context/auth';
import LoginDialog from '@/components/auth/LoginDialog';
import { toast } from 'sonner';

const Registration = () => {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [showLoginDialog, setShowLoginDialog] = useState(false);
  
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
    toast.success("Business registered successfully!");
    navigate('/');
  };
  
  return (
    <AppLayout 
      title="Register Business"
      fullHeight={false} 
      hideSidebar={true}
    >
      <motion.div 
        className="w-full max-w-5xl mx-auto px-2 py-2 md:py-6 overflow-visible form-container"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        skipMobileAnimations={isMobile}
      >
        <BusinessRegistrationForm onSuccess={handleFormSuccess} />
      </motion.div>
      
      {/* Login Dialog */}
      <LoginDialog open={showLoginDialog} onOpenChange={handleLoginDialogClose} />
    </AppLayout>
  );
};

export default Registration;
