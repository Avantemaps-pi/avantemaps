import { useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { secureLog } from '@/utils/secureLogger';
import { STORAGE_KEY } from '@/context/auth/types';

/**
 * Centralized Supabase session monitor.
 * - Intercepts fetch to detect auth failures (refresh_token_not_found, session_not_found)
 * - Performs idempotent hard reset on detection
 * - Listens to onAuthStateChange synchronously
 * 
 * Mount this ONCE in the app (e.g., in SessionManager via App.tsx).
 */
export const useSupabaseSession = (
  onSessionCleared?: () => void,
  onSessionRestored?: () => void
) => {
  const isHandlingError = useRef(false);
  const originalFetchRef = useRef<typeof window.fetch | null>(null);

  /**
   * Clear all Supabase-related storage to recover from corrupted sessions.
   * This is idempotent - safe to call multiple times.
   */
  const clearCorruptedSession = useCallback(async () => {
    if (isHandlingError.current) return;
    isHandlingError.current = true;
    
    try {
      secureLog.warn('Clearing corrupted Supabase session...');
      
      // Sign out from Supabase (best-effort)
      try {
        await supabase.auth.signOut();
      } catch (e) {
        // Ignore signout errors - we're clearing anyway
      }
      
      // Clear all Supabase-related localStorage keys
      const keysToRemove = Object.keys(localStorage).filter(key => 
        key.startsWith('sb-') || 
        key.includes('supabase') ||
        key === STORAGE_KEY
      );
      keysToRemove.forEach(key => localStorage.removeItem(key));
      
      // Clear session storage as well
      const sessionKeysToRemove = Object.keys(sessionStorage).filter(key =>
        key.startsWith('sb-') || key.includes('supabase')
      );
      sessionKeysToRemove.forEach(key => sessionStorage.removeItem(key));
      
      secureLog.info('Corrupted session cleared successfully');
      onSessionCleared?.();
    } catch (error) {
      secureLog.error('Error clearing corrupted session:', error);
    } finally {
      // Reset after a short delay to prevent rapid re-triggering
      setTimeout(() => {
        isHandlingError.current = false;
      }, 2000);
    }
  }, [onSessionCleared]);

  /**
   * Check if an error message indicates a session/token issue
   */
  const isSessionError = useCallback((error: any): boolean => {
    const message = (error?.message || error?.error || '').toLowerCase();
    const errorCode = (error?.error_code || error?.code || '').toLowerCase();
    
    return (
      message.includes('illegal base64') ||
      message.includes('refresh_token') ||
      message.includes('invalid refresh token') ||
      message.includes('refresh token not found') ||
      message.includes('token not found') ||
      message.includes('token is expired') ||
      message.includes('invalid jwt') ||
      message.includes('session not found') ||
      message.includes('session_not_found') ||
      message.includes("doesn't exist") ||
      errorCode.includes('session_not_found') ||
      errorCode.includes('refresh_token_not_found')
    );
  }, []);

  // Listen to auth state changes SYNCHRONOUSLY (critical to avoid deadlocks)
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        // SYNCHRONOUS callback - no async operations here!
        secureLog.info('Auth state change:', { event, hasSession: !!session });
        
        if (event === 'TOKEN_REFRESHED' || event === 'SIGNED_IN') {
          // Defer callback to avoid blocking
          setTimeout(() => onSessionRestored?.(), 0);
        }
        
        if (event === 'SIGNED_OUT') {
          // Clear app auth storage when Supabase signs out
          localStorage.removeItem(STORAGE_KEY);
          secureLog.info('App auth storage cleared on SIGNED_OUT');
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [onSessionRestored]);

  // Monitor for session errors by intercepting fetch
  useEffect(() => {
    // Store reference to original fetch
    originalFetchRef.current = window.fetch;
    const originalFetch = window.fetch;
    
    window.fetch = async (...args) => {
      const response = await originalFetch(...args);
      
      const url = typeof args[0] === 'string' ? args[0] : (args[0] as Request)?.url;
      
      // Only check Supabase auth requests
      if (!url?.includes('/auth/v1/')) {
        return response;
      }

      // Check for 400 on token refresh endpoint
      if (url.includes('token') && response.status === 400) {
        try {
          const clonedResponse = response.clone();
          const data = await clonedResponse.json();
          
          // Check response body for refresh token errors
          if (
            data?.error_code === 'refresh_token_not_found' ||
            data?.error?.includes('refresh') ||
            data?.error_description?.includes('illegal base64') ||
            data?.msg?.toLowerCase().includes('refresh token not found')
          ) {
            secureLog.error('Refresh token error detected via fetch:', data);
            clearCorruptedSession();
          }
        } catch {
          // Ignore JSON parse errors
        }
        
        // Also check x-sb-error-code header
        const errorCode = response.headers.get('x-sb-error-code');
        if (errorCode === 'refresh_token_not_found') {
          secureLog.error('Refresh token error detected via header');
          clearCorruptedSession();
        }
      }
      
      // Check for 403 "session not found" on /user endpoint
      if (url.includes('/user') && response.status === 403) {
        try {
          const clonedResponse = response.clone();
          const data = await clonedResponse.json();
          
          if (
            data?.error_code === 'session_not_found' ||
            data?.error === 'Session not found' ||
            data?.message?.toLowerCase().includes('session not found') ||
            data?.msg?.toLowerCase().includes("doesn't exist")
          ) {
            secureLog.error('Session not found error detected:', data);
            clearCorruptedSession();
          }
        } catch {
          // Ignore JSON parse errors
        }
      }
      
      return response;
    };

    return () => {
      // Restore original fetch
      if (originalFetchRef.current) {
        window.fetch = originalFetchRef.current;
      }
    };
  }, [clearCorruptedSession]);

  return {
    clearCorruptedSession,
    isSessionError,
    isRefreshTokenError: isSessionError, // Alias for backward compatibility
  };
};

export default useSupabaseSession;
