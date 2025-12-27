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
   * Check if an error is related to refresh token corruption
   */
  const isRefreshTokenError = useCallback((error: any): boolean => {
    const message = error?.message?.toLowerCase() || '';
    return (
      message.includes('illegal base64') ||
      message.includes('refresh_token') ||
      message.includes('invalid refresh token') ||
      message.includes('token is expired') ||
      message.includes('invalid jwt')
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

  // Monitor for refresh errors by intercepting fetch
  useEffect(() => {
    const originalFetch = window.fetch;
    
    window.fetch = async (...args) => {
      try {
        const response = await originalFetch(...args);
        
        // Check if this is a Supabase auth refresh request that failed
        const url = typeof args[0] === 'string' ? args[0] : (args[0] as Request)?.url;
        if (url?.includes('/auth/v1/token') && url?.includes('refresh_token')) {
          if (response.status === 400) {
            // Clone response to read body without consuming it
            const clonedResponse = response.clone();
            try {
              const data = await clonedResponse.json();
              if (data?.error_description?.includes('illegal base64') || 
                  data?.error?.includes('invalid')) {
                secureLog.error('Refresh token error detected:', data);
                // Don't await - let the original response return
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
    isRefreshTokenError,
  };
};

export default useSupabaseSession;
