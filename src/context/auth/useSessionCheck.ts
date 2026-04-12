
import { useEffect } from 'react';
import { isPiNetworkAvailable } from '@/utils/piNetwork';
import { STORAGE_KEY, SESSION_TIMEOUT, PiUser } from './types';

export const useSessionCheck = (
  isSdkInitialized: boolean,
  login: () => Promise<void>,
  setUser: (user: PiUser | null) => void,
  setIsLoading: (loading: boolean) => void
) => {
  useEffect(() => {
    if (!isSdkInitialized) return;
    
    const checkSession = async () => {
      try {
        const storedSession = localStorage.getItem(STORAGE_KEY);
        
        if (storedSession) {
          const sessionData = JSON.parse(storedSession) as PiUser;
          const currentTime = Date.now();
          
          // Check if session is still valid (within 24 hours)
          if (currentTime - sessionData.lastAuthenticated < SESSION_TIMEOUT) {
            setUser(sessionData);
          } else {
            // Session expired, try to re-authenticate
            await login();
          }
        } else {
          // Don't auto-login - wait for explicit user action
        }
      } catch (error) {
        console.error("Error checking session:", error);
      } finally {
        setIsLoading(false);
      }
    };

    checkSession();
  }, [isSdkInitialized, login, setUser, setIsLoading]);
};
