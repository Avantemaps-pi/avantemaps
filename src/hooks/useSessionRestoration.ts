import { useEffect } from 'react';
import { useAuth } from '@/context/auth';
import { secureLog } from '@/utils/secureLogger';

/**
 * Hook to handle page visibility changes and network reconnection.
 * 
 * Session error detection is now delegated to useSupabaseSession (via SessionManager).
 * This hook only handles:
 * - Refreshing user data when returning to the app after extended absence
 * - Refreshing user data when network connection is restored
 */
export const useSessionRestoration = () => {
  const { user, isOffline, refreshUserData } = useAuth();

  // Initialize browser active flag on mount
  useEffect(() => {
    sessionStorage.setItem('browser_active', 'true');
  }, []);

  // Detect when browser is closing
  useEffect(() => {
    const handlePageHide = () => {
      sessionStorage.removeItem('browser_active');
    };

    window.addEventListener('pagehide', handlePageHide);
    return () => window.removeEventListener('pagehide', handlePageHide);
  }, []);

  // Handle page visibility changes - trigger refresh when user returns after extended absence
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && user && !isOffline) {
        const lastRefresh = localStorage.getItem('last_user_refresh');
        const refreshThreshold = 15 * 60 * 1000; // 15 minutes
        const browserWasClosed = !sessionStorage.getItem('browser_active');
        
        sessionStorage.setItem('browser_active', 'true');
        
        // Only refresh if browser was closed and threshold passed
        if (browserWasClosed && (!lastRefresh || (Date.now() - parseInt(lastRefresh, 10) > refreshThreshold))) {
          secureLog.info('Browser was closed and 15+ minutes elapsed, refreshing user data');
          refreshUserData();
          localStorage.setItem('last_user_refresh', Date.now().toString());
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [user, isOffline, refreshUserData]);

  // Handle network status changes
  useEffect(() => {
    const handleOnline = () => {
      if (user) {
        secureLog.info('Network connection restored, refreshing user data');
        refreshUserData();
      }
    };

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [user, refreshUserData]);

  return null;
};
