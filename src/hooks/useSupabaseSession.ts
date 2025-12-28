import { useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { secureLog } from '@/utils/secureLogger';
import { STORAGE_KEY } from '@/context/auth/types';

/**
 * Hook to centralize Supabase session management and handle auth state changes.
 * Detects corrupted refresh tokens and clears them automatically.
 */
export const useSupabaseSession = (
  onSessionError?: () => void,
  onSessionRestored?: () => void
) => {
  const isHandlingError = useRef(false);

  /**
   * Clear all Supabase-related storage to recover from corrupted sessions
   */
  const clearCorruptedSession = useCallback(async () => {
    if (isHandlingError.current) return;
    isHandlingError.current = true;
    
    try {
      secureLog.warn('Clearing corrupted Supabase session (silent)...');
      
      // Sign out from Supabase
      await supabase.auth.signOut();
      
      // Clear all Supabase-related localStorage keys
      const keysToRemove = Object.keys(localStorage).filter(key => 
        key.startsWith('sb-') || 
        key.includes('supabase') ||
        key === STORAGE_KEY
      );
      keysToRemove.forEach(key => {
        localStorage.removeItem(key);
      });
      
      // Clear session storage as well
      const sessionKeysToRemove = Object.keys(sessionStorage).filter(key =>
        key.startsWith('sb-') || key.includes('supabase')
      );
      sessionKeysToRemove.forEach(key => sessionStorage.removeItem(key));
      
      secureLog.info('Corrupted session cleared successfully');
      // Callback without toast - let the caller decide if user needs notification
      onSessionError?.();
    } catch (error) {
      secureLog.error('Error clearing corrupted session:', error);
    } finally {
      isHandlingError.current = false;
    }
  }, [onSessionError]);

  /**
   * Check if an error is related to session/token issues
   */
  const isSessionError = useCallback((error: any): boolean => {
    const message = error?.message?.toLowerCase() || '';
    const errorCode = error?.code?.toLowerCase() || '';
    return (
      message.includes('illegal base64') ||
      message.includes('refresh_token') ||
      message.includes('invalid refresh token') ||
      message.includes('token is expired') ||
      message.includes('invalid jwt') ||
      message.includes('session not found') ||
      message.includes('session_not_found') ||
      errorCode.includes('session_not_found') ||
      message.includes("doesn't exist")
    );
  }, []);

  // Listen to auth state changes
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        secureLog.info('Auth state change:', { event, hasSession: !!session });
        
        switch (event) {
          case 'TOKEN_REFRESHED':
            secureLog.info('Token refreshed successfully');
            onSessionRestored?.();
            break;
            
          case 'SIGNED_OUT':
            secureLog.info('User signed out');
            break;
            
          case 'SIGNED_IN':
            secureLog.info('User signed in');
            onSessionRestored?.();
            break;
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [onSessionRestored]);

  // Monitor for session errors by intercepting fetch
  useEffect(() => {
    const originalFetch = window.fetch;
    
    window.fetch = async (...args) => {
      try {
        const response = await originalFetch(...args);
        
        const url = typeof args[0] === 'string' ? args[0] : (args[0] as Request)?.url;
        
        // Check if this is a Supabase auth request that failed
        if (url?.includes('/auth/v1/')) {
          // Handle 400 errors on token refresh
          if (url.includes('token') && url.includes('refresh_token') && response.status === 400) {
            const clonedResponse = response.clone();
            try {
              const data = await clonedResponse.json();
              if (data?.error_description?.includes('illegal base64') || 
                  data?.error?.includes('invalid')) {
                secureLog.error('Refresh token error detected:', data);
                clearCorruptedSession();
              }
            } catch {
              // Ignore JSON parse errors
            }
          }
          
          // Handle 403 "session not found" errors on /user endpoint
          if (url.includes('/user') && response.status === 403) {
            const clonedResponse = response.clone();
            try {
              const data = await clonedResponse.json();
              if (data?.error_code === 'session_not_found' || 
                  data?.message?.toLowerCase().includes('session not found') ||
                  data?.msg?.toLowerCase().includes("doesn't exist")) {
                secureLog.error('Session not found error detected:', data);
                clearCorruptedSession();
              }
            } catch {
              // Ignore JSON parse errors
            }
          }
        }
        
        return response;
      } catch (error) {
        throw error;
      }
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, [clearCorruptedSession]);

  return {
    clearCorruptedSession,
    isSessionError,
    isRefreshTokenError: isSessionError, // Alias for backward compatibility
  };
};

export default useSupabaseSession;
