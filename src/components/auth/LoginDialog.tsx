
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X, AlertCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from '@/context/auth';
import { isPiNetworkAvailable } from '@/utils/piNetwork';

interface LoginDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const LoginDialog: React.FC<LoginDialogProps> = ({ open, onOpenChange }) => {
  const { login, isLoading, authError } = useAuth();
  const [sdkAvailable, setSdkAvailable] = useState<boolean>(false);
  const [retryCount, setRetryCount] = useState<number>(0);
  
  useEffect(() => {
    // Check if Pi SDK is available
    setSdkAvailable(isPiNetworkAvailable());
    
    // More frequent checks when dialog is open
    const checkInterval = setInterval(() => {
      const available = isPiNetworkAvailable();
      setSdkAvailable(available);
      
      // If dialog is open and SDK becomes available, increment retry count
      if (open && available && retryCount === 0) {
        setRetryCount(1);
      }
    }, 1000);
    
    return () => clearInterval(checkInterval);
  }, [open, retryCount]);
  
  useEffect(() => {
    // Auto-retry SDK detection once when dialog opens
    if (open && !sdkAvailable && retryCount === 0) {
      const timer = setTimeout(() => {
        setRetryCount(1);
        setSdkAvailable(isPiNetworkAvailable());
      }, 2000);
      
      return () => clearTimeout(timer);
    }
  }, [open, sdkAvailable, retryCount]);
  
  const handleLogin = async () => {
    try {
      await login();
      // Only close on successful login - this will be handled by the auth flow
    } catch (error) {
      console.error('Login failed:', error);
    }
  };
  
  const handleContinueBrowsing = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md border rounded-lg shadow-lg bg-card">
        <div className="p-6 flex flex-col items-center">
          <DialogClose className="absolute right-4 top-4 opacity-70 hover:opacity-100">
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </DialogClose>
          
          <div className="w-20 h-20 rounded-full bg-gradient-to-r from-primary to-purple-500 flex items-center justify-center mb-6">
            <img src="/lovable-uploads/Avante-Maps-icon.svg" alt="Pi Logo" className="w-7 h-7" />
          </div>
          
          <DialogTitle className="text-2xl mb-4 text-center font-bold">
            Sign in to <span className="bg-gradient-to-r from-primary to-purple-500 bg-clip-text text-transparent">Avante Maps</span>
          </DialogTitle>
          
          {!sdkAvailable && (
            <div className="w-full bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800 text-yellow-800 dark:text-yellow-300 p-3 rounded-md mb-4 flex items-start">
              <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
              <p className="text-sm">
                Pi Network SDK not detected. Please ensure you're using the Pi Browser app.
              </p>
            </div>
          )}
          
          {authError && (
            <div className="w-full bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-300 p-3 rounded-md mb-4 flex items-start">
              <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
              <p className="text-sm">{authError}</p>
            </div>
          )}
          
          <div className="w-full bg-muted/50 p-4 rounded-lg mb-6">
            <div className="flex items-center">
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                <img src="/lovable-uploads/816179f9-d16d-46a7-9d6e-169846c0d0da.svg" alt="User" className="w-17 h-17" />
              </div>
              <div className="ml-4 text-left">
                <p className="font-medium text-lg">Pi Network User</p>
                <p className="text-sm text-muted-foreground">Connect with Pi Network</p>
              </div>
            </div>
          </div>
          
          <Button 
            className="w-full mb-3 bg-primary hover:bg-primary/90 text-primary-foreground font-medium py-3"
            onClick={handleLogin}
            disabled={isLoading || !sdkAvailable}
          >
            {isLoading 
              ? "Connecting..." 
              : !sdkAvailable
                ? "Pi Network Not Available"
                : "Connect with Pi Network"
            }
          </Button>
          
          <Button 
            variant="outline" 
            className="w-full mb-6" 
            onClick={handleContinueBrowsing}
          >
            Continue Browsing
          </Button>
          
          <div className="text-center text-sm text-muted-foreground px-4">
            <p>
              By connecting, Pi Network will share your profile information with Avante Maps. See our{' '}
              <Link to="/privacy" className="text-primary hover:underline">privacy policy</Link>
              {' '}and{' '}
              <Link to="/terms" className="text-primary hover:underline">terms of service</Link>.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default LoginDialog;
