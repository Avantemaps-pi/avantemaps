
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '@/components/layout/AppLayout';
import BusinessRegistrationForm from '@/components/business/BusinessRegistrationForm';
import { motion } from '@/components/ui/motion';
import { useIsMobile } from '@/hooks/use-mobile';
import { toast } from 'sonner';

const Registration = () => {
  const isMobile = useIsMobile();
  const navigate = useNavigate();

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
    </AppLayout>
  );
};

export default Registration;
