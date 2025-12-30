import { useCallback } from 'react';
import { useSupabaseSession } from '@/hooks/useSupabaseSession';
import { useAuth } from '@/context/auth';
import { secureLog } from '@/utils/secureLogger';

/**
 * Centralized session manager component.
 * Mounts the useSupabaseSession hook once and coordinates with AuthContext.
 * 
 * Should be mounted inside AuthProvider but only once in the app tree.
 */
export const SessionManager = () => {
  const { setUser, refreshUserData } = useAuth();

  const handleSessionCleared = useCallback(() => {
    secureLog.info('SessionManager: Session cleared, resetting user state');
    setUser(null);
  }, [setUser]);

  const handleSessionRestored = useCallback(() => {
    secureLog.info('SessionManager: Session restored/refreshed');
    // Optionally refresh user data on token refresh
    // Using setTimeout to defer and avoid blocking
    setTimeout(() => {
      refreshUserData?.();
    }, 100);
  }, [refreshUserData]);

  // Mount the centralized session monitor
  useSupabaseSession(handleSessionCleared, handleSessionRestored);

  return null;
};

export default SessionManager;
