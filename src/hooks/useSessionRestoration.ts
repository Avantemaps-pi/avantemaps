
import { useEffect } from 'react';
import { useAuth } from '@/context/auth';

/**
 * Hook to restore the user's session when they return to the app
 * and handle automatic session management.
 * 
 * Only triggers re-authentication after 15 minutes of inactivity
 * AND when the Pi Browser was completely closed (not just tab switches).
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
      // Remove the flag when browser is closing
      sessionStorage.removeItem('browser_active');
    };

    window.addEventListener('pagehide', handlePageHide);
    
    return () => {
      window.removeEventListener('pagehide', handlePageHide);
    };
  }, []);

  // Handle page visibility changes
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && user && !isOffline) {
        // User has returned to the app after being away
        console.log("User returned to app, checking session status");
        
        // Get the last refresh time from localStorage
        const lastRefresh = localStorage.getItem('last_user_refresh');
        const refreshThreshold = 15 * 60 * 1000; // 15 minutes
        
        // Check if browser was actually closed (sessionStorage cleared)
        const browserWasClosed = !sessionStorage.getItem('browser_active');
        
        // Re-set the browser active flag
        sessionStorage.setItem('browser_active', 'true');
        
        // Only refresh if:
        // 1. More than 15 minutes have passed since last refresh
        // 2. AND the browser was actually closed (not just tab switch)
        if (browserWasClosed && (!lastRefresh || (Date.now() - parseInt(lastRefresh, 10) > refreshThreshold))) {
          console.log("Browser was closed and 15+ minutes elapsed, refreshing user data");
          refreshUserData();
          localStorage.setItem('last_user_refresh', Date.now().toString());
        }
      }
    };

    // Listen for visibility changes
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Clean up
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user, isOffline, refreshUserData]);

  // Handle network status changes
  useEffect(() => {
    const handleOnline = () => {
      if (user) {
        console.log("Network connection restored, refreshing user data");
        refreshUserData();
      }
    };

    window.addEventListener('online', handleOnline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
    };
  }, [user, refreshUserData]);

  return null;
};
