
import { useState, useEffect } from 'react';
import { toast } from 'sonner';

export const useNetworkStatus = (
  pendingAuthRef: React.MutableRefObject<boolean>,
  triggerLogin: () => Promise<void>
) => {
  const [isOffline, setIsOffline] = useState<boolean>(!navigator.onLine);
  
  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      toast.success("You're back online!");
      
      // If there was a pending authentication, retry it
      if (pendingAuthRef.current) {
        triggerLogin();
        pendingAuthRef.current = false;
      }
    };

    const handleOffline = () => {
      setIsOffline(true);
      toast.warning("You're currently offline. Some features may be unavailable.");
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [pendingAuthRef, triggerLogin]);

  return isOffline;
};
