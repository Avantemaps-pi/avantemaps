import React, { useState, useEffect, useRef, useCallback } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { initializePiNetwork } from '@/utils/piNetwork';
import { PiUser, AuthContextType, STORAGE_KEY } from './types';
import { checkAccess } from './authUtils';
import { performLogin, refreshUserData as refreshUserDataService, requestAuthPermissions } from './authService';
import { useNetworkStatus } from './networkStatusService';
import { SubscriptionTier } from '@/utils/piNetwork/types';
import { shouldBypassAuth, DEV_CONFIG } from '@/config/environment';
import AuthContext from './useAuth';
import { secureLog } from '@/utils/secureLogger';
import { getPiAuthResult } from '@/utils/piNetwork/core';
import { verifyPiAuthentication } from '@/utils/piNetwork/verification';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<PiUser | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isSdkInitialized, setIsSdkInitialized] = useState<boolean>(false);
  const [lastRefresh, setLastRefresh] = useState<number>(0);
  const [appReady, setAppReady] = useState<boolean>(true);
  const pendingAuthRef = useRef<boolean>(false);
  const initAttempted = useRef<boolean>(false);
  const authTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const devModeToastShown = useRef<boolean>(false);
  const isMountedRef = useRef<boolean>(true);

  // ✅ Safe state setters
  const safeSetUser = useCallback((u: PiUser | null) => {
    if (isMountedRef.current) setUser(u);
  }, []);

  const safeSetIsLoading = useCallback((loading: boolean) => {
    if (isMountedRef.current) setIsLoading(loading);
  }, []);

  const safeSetAuthError = useCallback((error: string | null) => {
    if (isMountedRef.current) setAuthError(error);
  }, []);

  const safeSetIsSdkInitialized = useCallback((initialized: boolean) => {
    if (isMountedRef.current) setIsSdkInitialized(initialized);
  }, []);

  const safeSetAppReady = useCallback((ready: boolean) => {
    if (isMountedRef.current) setAppReady(ready);
  }, []);

  // ✅ Lifecycle cleanup
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (authTimeoutRef.current) clearTimeout(authTimeoutRef.current);
    };
  }, []);

  // ✅ Global error and unhandled rejection monitoring
  useEffect(() => {
    let reloadTimeout: NodeJS.Timeout | null = null;

    const handleError = (event: ErrorEvent) => {
      const message = event?.error?.message || event?.message || 'An unexpected error occurred.';
      console.error('🌍 Global error caught:', event.error || event.message);
      toast.error(`App error: ${message}`, { duration: 6000, description: 'Trying to recover...' });

      if (!reloadTimeout && !document.hidden) {
        reloadTimeout = setTimeout(() => {
          console.warn('🔁 Reloading app to recover...');
          window.location.reload();
        }, 5000);
      }
    };

    const handleRejection = (event: PromiseRejectionEvent) => {
      const reason = event?.reason?.message || event?.reason || 'An unknown issue occurred.';
      console.error('🚨 Unhandled promise rejection:', event.reason);
      toast.error(`Unexpected issue: ${reason}`, { duration: 6000, description: 'Attempting to recover...' });

      if (!reloadTimeout && !document.hidden) {
        reloadTimeout = setTimeout(() => {
          console.warn('🔁 Reloading app to recover...');
          window.location.reload();
        }, 5000);
      }
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleRejection);
    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleRejection);
      if (reloadTimeout) clearTimeout(reloadTimeout);
    };
  }, []);

  const REFRESH_COOLDOWN = 15 * 60 * 1000;
  const AUTH_TIMEOUT = 45 * 1000;

  // ✅ Token verification
  const isTokenValid = async (accessToken?: string): Promise<boolean> => {
    try {
      if (shouldBypassAuth()) return true;

      const token = accessToken || getPiAuthResult()?.accessToken || '';
      if (!token) return true;

      const result = await verifyPiAuthentication(token, user?.uid ?? '', user?.username ?? '');
      return !!result.verified;
    } catch (error) {
      console.error('Token validation error:', error);
      return false;
    }
  };

  // ✅ Cached session restoration
  useEffect(() => {
    if (shouldBypassAuth()) {
      secureLog.info('Development mode: bypassing authentication');
      const mockUser = { ...DEV_CONFIG.mockUser, lastAuthenticated: Date.now() };
      safeSetUser(mockUser);
      
      // Setup Supabase session in dev mode to ensure RLS works
      const setupDevSession = async () => {
        try {
          const response = await fetch('https://xvpwbocwasbtzrzrxyvu.supabase.co/functions/v1/verify-pi-auth?test=true', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              accessToken: 'dev-test-token',
              uid: DEV_CONFIG.mockUser.uid,
              username: DEV_CONFIG.mockUser.username
            })
          });

          const data = await response.json();
          
          if (data.verified && data.supabase_token) {
            await supabase.auth.setSession({
              access_token: data.supabase_token,
              refresh_token: data.supabase_token
            });
            secureLog.info('✅ Dev mode Supabase session established');
          } else {
            secureLog.warn('⚠️ Dev mode: verify-pi-auth did not return session token');
          }
        } catch (error) {
          secureLog.error('Failed to setup dev Supabase session:', error);
          toast.error('Dev mode: Failed to setup database session. RLS may block queries.');
        }
      };

      setupDevSession();
      
      import('./authUtils').then(({ updateUserData }) => {
        updateUserData(mockUser, safeSetUser).catch(err =>
          secureLog.warn('Failed to create dev user in database:', err)
        );
      });
      return;
    }

    const restoreSession = () => {
      const cachedSession = localStorage.getItem(STORAGE_KEY);
      if (!cachedSession) return;

      try {
        const userData = JSON.parse(cachedSession) as PiUser;
        if (Date.now() - userData.lastAuthenticated < 24 * 60 * 60 * 1000) {
          secureLog.info('Restoring user from cached session');
          safeSetUser(userData);
        } else {
          secureLog.info('Cached session expired');
          localStorage.removeItem(STORAGE_KEY);
        }
      } catch (error) {
        secureLog.error('Error parsing cached session:', error);
        localStorage.removeItem(STORAGE_KEY);
      }
    };

    // Delay session restore until SDK initializes
    const timer = setTimeout(restoreSession, 1500);
    return () => clearTimeout(timer);
  }, []);

  // ✅ Initialize Pi SDK
  useEffect(() => {
    if (initAttempted.current) return;
    initAttempted.current = true;

    const initSdk = async () => {
      try {
        secureLog.info('Starting Pi Network SDK initialization...');
        const result = await initializePiNetwork();
        safeSetIsSdkInitialized(result);
        secureLog.info('Pi Network SDK initialization complete:', result);
      } catch (error) {
        secureLog.error('Failed to initialize Pi SDK:', error);
        toast.error('Failed to initialize Pi Network SDK. Some features may not work.');
        safeSetIsSdkInitialized(false);
      }
    };
    initSdk();
  }, [safeSetIsSdkInitialized]);

  // ✅ Login
  const login = useCallback(async (): Promise<void> => {
    if (shouldBypassAuth()) {
      const mockUser = { ...DEV_CONFIG.mockUser, lastAuthenticated: Date.now() };
      safeSetUser(mockUser);
      
      // Setup Supabase session in dev mode
      try {
        const response = await fetch('https://xvpwbocwasbtzrzrxyvu.supabase.co/functions/v1/verify-pi-auth?test=true', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            accessToken: 'dev-test-token',
            uid: DEV_CONFIG.mockUser.uid,
            username: DEV_CONFIG.mockUser.username
          })
        });

        const data = await response.json();
        
        if (data.verified && data.supabase_token) {
          await supabase.auth.setSession({
            access_token: data.supabase_token,
            refresh_token: data.supabase_token
          });
          secureLog.info('✅ Dev mode Supabase session established');
        }
      } catch (error) {
        secureLog.error('Failed to setup dev Supabase session:', error);
      }
      
      if (!devModeToastShown.current) {
        toast.success('Development mode: Logged in as mock user');
        devModeToastShown.current = true;
      }
      return;
    }

    if (pendingAuthRef.current) {
      toast.info('Authentication in progress, please wait...');
      return;
    }

    pendingAuthRef.current = true;
    safeSetIsLoading(true);
    safeSetAppReady(false);

    if (authTimeoutRef.current) clearTimeout(authTimeoutRef.current);
    authTimeoutRef.current = setTimeout(() => {
      safeSetIsLoading(false);
      safeSetAuthError('Authentication timed out. Please retry.');
      toast.error('Authentication timeout. Check your connection.', { duration: 6000 });
      pendingAuthRef.current = false;
    }, AUTH_TIMEOUT);

    try {
      if (!isSdkInitialized) {
        const sdkResult = await initializePiNetwork();
        safeSetIsSdkInitialized(sdkResult);
        if (!sdkResult) throw new Error('SDK initialization failed');
      }

      const permissionsGranted = await requestAuthPermissions(isSdkInitialized, safeSetIsLoading, safeSetAuthError);
      if (!permissionsGranted) return;

      await performLogin(
        isSdkInitialized,
        safeSetIsLoading,
        safeSetAuthError,
        (pending) => { pendingAuthRef.current = pending; },
        safeSetUser
      );

      setLastRefresh(Date.now());
      safeSetAppReady(true); // ✅ ensure app resumes
    } catch (error) {
      console.error('Login process error:', error);
      toast.error(error instanceof Error ? error.message : 'Authentication failed.');
    } finally {
      if (authTimeoutRef.current) clearTimeout(authTimeoutRef.current);
      authTimeoutRef.current = null;
      safeSetIsLoading(false);
      pendingAuthRef.current = false; // ✅ ensure reset
    }
  }, [isSdkInitialized, AUTH_TIMEOUT, safeSetIsLoading, safeSetAuthError, safeSetIsSdkInitialized, safeSetUser, safeSetAppReady]);

  // ✅ Offline handler
  const isOffline = useNetworkStatus(pendingAuthRef, login);

  // ✅ Refresh user data
  const refreshUserData = useCallback(async (force = false): Promise<void> => {
    const now = Date.now();
    if (!force && now - lastRefresh < REFRESH_COOLDOWN) return;

    if (!isSdkInitialized) {
      try {
        const result = await initializePiNetwork();
        safeSetIsSdkInitialized(result);
      } catch (error) {
        console.error('Failed to init SDK during refresh:', error);
        return;
      }
    }

    if (!user) {
      secureLog.info('No user to refresh');
      return;
    }

    safeSetIsLoading(true);
    try {
      const stillValid = await isTokenValid(user?.accessToken ?? '');
      if (!stillValid) {
        secureLog.warn('Token expired — triggering re-login');
        await login();
        return;
      }

      await refreshUserDataService(user, safeSetUser, safeSetIsLoading);
      secureLog.info('User data refreshed');
      setLastRefresh(now);
    } catch (error) {
      secureLog.error('Failed to refresh user data:', error);
    } finally {
      safeSetIsLoading(false);
    }
  }, [user, isSdkInitialized, lastRefresh, login, safeSetIsSdkInitialized]);

  // ✅ Silent refresh
  useEffect(() => {
    if (user && !isOffline && isSdkInitialized) {
      const timer = setTimeout(() => refreshUserData(false), 1000);
      return () => clearTimeout(timer);
    }
  }, [user, isOffline, isSdkInitialized, refreshUserData]);

  // ✅ Logout
  const logout = (): void => {
    localStorage.removeItem(STORAGE_KEY);
    safeSetUser(null);
    toast.info("You've been logged out");
  };

  // ✅ Subscription check
  const hasAccess = useCallback(
    (requiredTier: SubscriptionTier): boolean => user ? checkAccess(user.subscriptionTier, requiredTier) : false,
    [user]
  );

  // ✅ Admin check
  const isAdmin = user?.roles?.includes('admin') ?? false;

  // ✅ Runtime token monitor
  useEffect(() => {
    if (!user?.accessToken) return;
    const interval = setInterval(async () => {
      const stillValid = await isTokenValid(user.accessToken);
      if (!stillValid) {
        secureLog.warn('Runtime token expired, reauthenticating');
        await login();
      }
    }, 10 * 60 * 1000);
    return () => clearInterval(interval);
  }, [user, login]);

  // ✅ Listen for "app-ready" events
  useEffect(() => {
    const handleAppReady = () => safeSetAppReady(true);
    window.addEventListener('app-ready', handleAppReady);
    return () => window.removeEventListener('app-ready', handleAppReady);
  }, [safeSetAppReady]);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        isOffline,
        appReady,
        login,
        logout,
        authError,
        hasAccess,
        refreshUserData: () => refreshUserData(true),
        setUser: safeSetUser,
        isAdmin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
