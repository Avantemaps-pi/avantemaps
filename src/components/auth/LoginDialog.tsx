
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X, AlertCircle, HelpCircle, RefreshCw } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from '@/context/auth';
import { isPiNetworkAvailable } from '@/utils/piNetwork';
import AuthTroubleshooting from './AuthTroubleshooting';
import { secureLog } from '@/utils/secureLogger';
import { toast } from 'sonner';

// Map raw errors to friendly, actionable messages for end users
const friendlyAuthError = (err: unknown): string => {
  const raw = (err instanceof Error ? err.message : String(err ?? '')).toLowerCase();
  if (!raw || raw === 'undefined' || raw === 'null') {
    return "We couldn't sign you in. Please try again.";
  }
  if (raw.includes('cancel') || raw.includes('user_cancelled') || raw.includes('aborted')) {
    return "Sign-in was cancelled. Tap Connect with Pi Network to try again.";
  }
  if (raw.includes('network') || raw.includes('fetch') || raw.includes('offline') || raw.includes('timeout')) {
    return "Network issue while contacting Pi Network. Check your connection and try again.";
  }
  if (raw.includes('sdk') || raw.includes('window.pi') || raw.includes('not available') || raw.includes('pi browser')) {
    return "Pi Network SDK is not available. Please open Avante Maps in the Pi Browser.";
  }
  if (raw.includes('permission') || raw.includes('scope') || raw.includes('denied')) {
    return "Required Pi Network permissions were not granted. Please approve all requested permissions to continue.";
  }
  if (raw.includes('unauthorized') || raw.includes('401') || raw.includes('invalid token') || raw.includes('jwt')) {
    return "Your Pi Network session is invalid or expired. Please try signing in again.";
  }
  if (raw.includes('rate') || raw.includes('429')) {
    return "Too many sign-in attempts. Please wait a moment and try again.";
  }
  if (raw.includes('500') || raw.includes('server')) {
    return "Pi Network is temporarily unavailable. Please try again in a few minutes.";
  }
  return "Sign-in failed. Please try again, or use the troubleshooting steps below.";
};


// Check if we're in a preview/dev environment where test mode is allowed
const isPreviewOrDev = (): boolean => {
  if (typeof window === 'undefined') return false;
  const host = window.location.host;
  return host.includes('lovableproject.com') || 
         host.includes('localhost') || 
         host.includes('127.0.0.1');
};

interface LoginDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const LoginDialog: React.FC<LoginDialogProps> = ({ open, onOpenChange }) => {
  const { login, isLoading, authError } = useAuth();
  const [sdkAvailable, setSdkAvailable] = useState<boolean>(false);
  const [retryCount, setRetryCount] = useState<number>(0);
  const [showTroubleshooting, setShowTroubleshooting] = useState<boolean>(false);
  
  useEffect(() => {
    // In preview/dev environments, allow login even without SDK
    const allowTestMode = isPreviewOrDev();
    setSdkAvailable(allowTestMode || isPiNetworkAvailable());
    
    // More frequent checks when dialog is open
    const checkInterval = setInterval(() => {
      const available = allowTestMode || isPiNetworkAvailable();
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
    const allowTestMode = isPreviewOrDev();
    if (open && !sdkAvailable && retryCount === 0) {
      const timer = setTimeout(() => {
        setRetryCount(1);
        setSdkAvailable(allowTestMode || isPiNetworkAvailable());
      }, 2000);
      
      return () => clearTimeout(timer);
    }
  }, [open, sdkAvailable, retryCount]);

  console.log("SDK check:", {
    hasPi: !!window.Pi,
    hasAuthenticate: typeof window.Pi?.authenticate,
    isSdkAvailable: sdkAvailable,
  });

  
  const handleLogin = async () => {
    try {
      secureLog.info("Starting Pi authentication...");
      
      // Use the auth context's login function which handles both
      // real Pi authentication and test/dev mode
      await login();
      onOpenChange(false);
    } catch (error) {
      secureLog.error("❌ Pi login error:", error);
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
          
          <div className="w-20 h-20 rounded-full flex items-center justify-center mb-6">
            <img src="/lovable-uploads/Avante-Maps-icon.svg" alt="Pi Logo" className="w-17 h-17" />
          </div>
          
          <DialogTitle className="text-2xl mb-4 text-center font-bold">
            Sign in to <span className="bg-gradient-to-r from-primary to-purple-500 bg-clip-text text-transparent">Avante Maps</span>
          </DialogTitle>
          
          {!sdkAvailable && (
            <div className="w-full bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800 text-yellow-800 dark:text-yellow-300 p-3 rounded-md mb-4 flex items-start">
              <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-semibold mb-1">Pi Network SDK not detected</p>
                <p>Please ensure you're using the official Pi Browser app. This application requires Pi Network authentication to function properly.</p>
              </div>
            </div>
          )}
          
          {authError && (
            <div className="w-full bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-300 p-3 rounded-md mb-4 flex items-start">
              <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-semibold mb-1">Authentication Error</p>
                <p>{authError}</p>
                <p className="mt-2 text-xs opacity-80">If this issue persists, please try closing and reopening the Pi Browser, or check your internet connection.</p>
              </div>
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
            className="w-full mb-3"
            onClick={handleContinueBrowsing}
          >
            Continue Browsing
          </Button>

          <Button
            variant="ghost"
            className="w-full mb-6 text-sm"
            onClick={() => setShowTroubleshooting(!showTroubleshooting)}
          >
            <HelpCircle className="h-4 w-4 mr-2" />
            {showTroubleshooting ? 'Hide' : 'Show'} Troubleshooting
          </Button>

          <AuthTroubleshooting isVisible={showTroubleshooting} />
          
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
