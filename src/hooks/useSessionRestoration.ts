import { useEffect, useCallback } from 'react';
import { useAuth } from '@/context/auth';
import { supabase } from '@/integrations/supabase/client';
import { secureLog } from '@/utils/secureLogger';
import { STORAGE_KEY } from '@/context/auth/types';

/**
 * Hook to restore the user's session when they return to the app
 * and handle automatic session management.
 * 
 * Includes detection and recovery from corrupted refresh tokens.
 */
export const useSessionRestoration = () => {
  const { user, isOffline, refreshUserData, login, logout } = useAuth();

  /**
   * Clear corrupted session data and trigger re-authentication
   */
  const handleCorruptedSession = useCallback(async () => {
    secureLog.warn('Handling corrupted session - clearing and re-authenticating');
    
    try {
      // Sign out from Supabase
      await supabase.auth.signOut();
    } catch (e) {
      // Ignore errors during signout
    }
    
    // Clear all auth-related storage
    localStorage.removeItem(STORAGE_KEY);
    const keysToRemove = Object.keys(localStorage).filter(key => 
      key.startsWith('sb-') || key.includes('supabase')
    );
    keysToRemove.forEach(key => localStorage.removeItem(key));
    
    // Clear session storage
    sessionStorage.removeItem('browser_active');
    
    // Trigger re-login
    await login();
  }, [login]);

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

  // Monitor for refresh token errors
  useEffect(() => {
    const handleAuthError = async (event: CustomEvent) => {
      const error = event.detail?.error;
      if (error) {
        const message = error.message?.toLowerCase() || '';
        if (
          message.includes('illegal base64') ||
          message.includes('refresh_token') ||
          message.includes('invalid refresh token')
        ) {
          secureLog.error('Refresh token error detected via event:', error);
          await handleCorruptedSession();
        }
      }
    };

    window.addEventListener('supabase-auth-error' as any, handleAuthError);
    return () => window.removeEventListener('supabase-auth-error' as any, handleAuthError);
  }, [handleCorruptedSession]);

  // Handle page visibility changes
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible' && user && !isOffline) {
        secureLog.info("User returned to app, checking session status");
        
        const lastRefresh = localStorage.getItem('last_user_refresh');
        const refreshThreshold = 15 * 60 * 1000; // 15 minutes
        const browserWasClosed = !sessionStorage.getItem('browser_active');
        
        sessionStorage.setItem('browser_active', 'true');
        
        // Check if session is still valid before refreshing
        try {
          const { data: { session }, error } = await supabase.auth.getSession();
          
          if (error) {
            const errorMsg = error.message?.toLowerCase() || '';
            if (errorMsg.includes('illegal base64') || errorMsg.includes('refresh')) {
              secureLog.error('Session check revealed corrupted token:', error);
              await handleCorruptedSession();
              return;
            }
          }
          
          // Only refresh if browser was closed and threshold passed
          if (browserWasClosed && (!lastRefresh || (Date.now() - parseInt(lastRefresh, 10) > refreshThreshold))) {
            secureLog.info("Browser was closed and 15+ minutes elapsed, refreshing user data");
            refreshUserData();
            localStorage.setItem('last_user_refresh', Date.now().toString());
          }
        } catch (e: any) {
          const errorMsg = e?.message?.toLowerCase() || '';
          if (errorMsg.includes('illegal base64') || errorMsg.includes('refresh')) {
            await handleCorruptedSession();
          }
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [user, isOffline, refreshUserData, handleCorruptedSession]);

  // Handle network status changes
  useEffect(() => {
    const handleOnline = () => {
      if (user) {
        secureLog.info("Network connection restored, refreshing user data");
        refreshUserData();
      }
    };

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [user, refreshUserData]);

  return null;
};
