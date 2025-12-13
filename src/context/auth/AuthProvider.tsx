import React, { useState, useEffect, useRef, useCallback } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { initializePiNetwork, getPiAuthResult } from '@/utils/piNetwork/core';
import { PiUser, AuthContextType, STORAGE_KEY } from './types';
import { checkAccess } from './authUtils';
import { performLogin, refreshUserData as refreshUserDataService, requestAuthPermissions } from './authService';
import { useNetworkStatus } from './networkStatusService';
import { SubscriptionTier } from '@/utils/piNetwork/types';
import { shouldBypassAuth, DEV_CONFIG } from '@/config/environment';
import AuthContext from './useAuth';
import { secureLog } from '@/utils/secureLogger';
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

  // safe setters
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

  useEffect(() => {
    isMountedRef.current = true;
    
    // Clear corrupted Supabase tokens on mount to prevent white screen
    const clearCorruptedSession = async () => {
      try {
        const { error } = await supabase.auth.getSession();
        if (error) {
          secureLog.warn('Corrupted session detected, clearing...', error.message);
          await supabase.auth.signOut();
          localStorage.removeItem(STORAGE_KEY);
        }
      } catch (e) {
        secureLog.error('Error checking session:', e);
        await supabase.auth.signOut();
      }
    };
    clearCorruptedSession();
    
    return () => {
      isMountedRef.current = false;
      if (authTimeoutRef.current) clearTimeout(authTimeoutRef.current);
    };
  }, []);

  // global error handlers (unchanged)
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
  const AUTH_TIMEOUT = 120 * 1000;

  // --- Token verification (fixed: return false when no token unless bypass) ---
  const isTokenValid = async (accessToken?: string): Promise<boolean> => {
    try {
      if (shouldBypassAuth()) return true;

      const token = accessToken || getPiAuthResult()?.accessToken;
      // if there is no token, treat as invalid (force re-auth)
      if (!token) return false;

      const result = await verifyPiAuthentication(token, user?.uid ?? '', user?.username ?? '');
      return !!result.verified;
    } catch (error) {
      console.error('Token validation error:', error);
      return false;
    }
  };

  // --- Cached session restoration & dev bypass handling (unchanged logic, kept safe) ---
  useEffect(() => {
    if (shouldBypassAuth()) {
      secureLog.info('Development mode: bypassing authentication');
      const mockUser = { ...DEV_CONFIG.mockUser, lastAuthenticated: Date.now() };
      safeSetUser(mockUser);

      const setupDevSession = async () => {
        try {
          secureLog.info('🔧 Setting up dev mode session...');
          const response = await fetch('https://xvpwbocwasbtzrzrxyvu.supabase.co/functions/v1/verify-pi-auth?test=true', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              accessToken: 'dev-test-token',
              uid: DEV_CONFIG.mockUser.uid,
              username: DEV_CONFIG.mockUser.username
            })
          });

          if (!response.ok) {
            const errorText = await response.text();
            secureLog.error(`❌ verify-pi-auth request failed: ${response.status}`, errorText);
            toast.error('Dev mode: Failed to get session token');
            return;
          }

          const data = await response.json();
          secureLog.info('📦 verify-pi-auth response:', { 
            verified: data.verified, 
            hasToken: !!data.supabase_token,
            testMode: data.testMode 
          });
          
          if (data.verified && data.supabase_token) {
            secureLog.info('🔐 Setting Supabase session with token...');
            const sessionPayload: any = { access_token: data.supabase_token };
            if (data.refresh_token) sessionPayload.refresh_token = data.refresh_token;
            
            const { data: sessionData, error: sessionError } = await supabase.auth.setSession(sessionPayload);

            if (sessionError) {
              secureLog.error('❌ Failed to set Supabase session:', sessionError);
              toast.error('Dev mode: Failed to setup database session. RLS may block queries.');
            } else {
              secureLog.info('✅ Dev mode Supabase session set:', { 
                userId: sessionData?.user?.id,
                hasSession: !!sessionData?.session
              });
              const { data: { session } } = await supabase.auth.getSession();
              if (session) {
                secureLog.info('✅ Session verified - User ID:', session.user.id);
                const { data: testData, error: testError } = await supabase
                  .from('users')
                  .select('id')
                  .eq('id', session.user.id)
                  .single();
                if (testError) secureLog.warn('⚠️ Test query failed:', testError);
                else secureLog.info('✅ Session working - test query succeeded');
              } else {
                secureLog.warn('⚠️ Session not found after setSession');
                toast.error('Dev mode: Session verification failed');
              }
            }
          } else {
            secureLog.warn('⚠️ Dev mode: verify-pi-auth did not return session token', data);
            toast.error('Dev mode: No session token received');
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

    // Delay restore slightly to allow SDK load
    const timer = setTimeout(restoreSession, 1500);
    return () => clearTimeout(timer);
  }, [safeSetUser]);

  // --- Robust SDK initialization helper (retries + timeout) ---
  const ensureSdkInitialized = useCallback(async (maxAttempts = 3, delayMs = 700): Promise<boolean> => {
    if (isSdkInitialized) return true;
    // prevent parallel inits
    if (initAttempted.current && !isSdkInitialized) {
      // If initAttempted but isn't initialized yet, still try a few times:
      // fall through to attempts
    }
    initAttempted.current = true;

    let attempt = 0;
    while (attempt < maxAttempts) {
      attempt++;
      try {
        secureLog.info(`Attempting Pi SDK init (attempt ${attempt})...`);
        const result = await initializePiNetwork();
        safeSetIsSdkInitialized(!!result);
        if (result) {
          secureLog.info('Pi SDK initialized successfully');
          return true;
        }
        secureLog.warn('initializePiNetwork returned falsy result, retrying...');
      } catch (err) {
        secureLog.error('initializePiNetwork threw:', err);
      }
      // delay before next attempt
      await new Promise((res) => setTimeout(res, delayMs));
    }
    secureLog.error('Pi SDK failed to initialize after attempts');
    safeSetIsSdkInitialized(false);
    return false;
  }, [isSdkInitialized, safeSetIsSdkInitialized]);

  // initialize once on mount (best-effort)
  useEffect(() => {
    (async () => {
      await ensureSdkInitialized(3, 700);
    })();
  }, [ensureSdkInitialized]);

  // --- Login flow (fixed cleanup + ensure SDK ready) ---
  const login = useCallback(async (): Promise<void> => {
    if (shouldBypassAuth()) {
      const mockUser = { ...DEV_CONFIG.mockUser, lastAuthenticated: Date.now() };
      safeSetUser(mockUser);
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
          const sessionPayload: any = { access_token: data.supabase_token };
          if (data.refresh_token) sessionPayload.refresh_token = data.refresh_token;
          await supabase.auth.setSession(sessionPayload);
          secureLog.info('✅ Dev mode Supabase session established in login()');
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
      // ensure the SDK is initialized before proceeding
      const sdkReady = await ensureSdkInitialized(4, 600);
      if (!sdkReady) throw new Error('SDK initialization failed');

      const permissionsGranted = await requestAuthPermissions(isSdkInitialized, safeSetIsLoading, safeSetAuthError);
      if (!permissionsGranted) {
        // Clean up properly if the user declined or permissions step failed
        secureLog.warn('Permissions not granted or were declined by user');
        if (authTimeoutRef.current) {
          clearTimeout(authTimeoutRef.current);
          authTimeoutRef.current = null;
        }
        safeSetIsLoading(false);
        pendingAuthRef.current = false;
        safeSetAppReady(true);
        return;
      }

      await performLogin(
        isSdkInitialized,
        safeSetIsLoading,
        safeSetAuthError,
        (pending) => { pendingAuthRef.current = pending; },
        safeSetUser
      );

      setLastRefresh(Date.now());
      safeSetAppReady(true);
    } catch (error: any) {
      console.error('Login process error:', error);
      secureLog.error('Login failed:', error);
      toast.error(error instanceof Error ? error.message : 'Authentication failed.');
    } finally {
      if (authTimeoutRef.current) {
        clearTimeout(authTimeoutRef.current);
        authTimeoutRef.current = null;
      }
      safeSetIsLoading(false);
      pendingAuthRef.current = false;
    }
  }, [ensureSdkInitialized, isSdkInitialized, safeSetIsLoading, safeSetAuthError, safeSetUser, safeSetAppReady]);

  // offline handler
  const isOffline = useNetworkStatus(pendingAuthRef, login);

  // refresh user data
  const refreshUserData = useCallback(async (force = false): Promise<void> => {
    const now = Date.now();
    if (!force && now - lastRefresh < REFRESH_COOLDOWN) return;

    if (!isSdkInitialized) {
      const ok = await ensureSdkInitialized(3, 600);
      if (!ok) {
        secureLog.error('Failed to init SDK during refresh: aborting refresh');
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
  }, [user, isSdkInitialized, lastRefresh, login, ensureSdkInitialized]);

  // silent refresh when appropriate
  useEffect(() => {
    if (user && !isOffline && isSdkInitialized) {
      const timer = setTimeout(() => refreshUserData(false), 1000);
      return () => clearTimeout(timer);
    }
  }, [user, isOffline, isSdkInitialized, refreshUserData]);

  // logout
  const logout = (): void => {
    localStorage.removeItem(STORAGE_KEY);
    safeSetUser(null);
    toast.info("You've been logged out");
  };

  // access helpers
  const hasAccess = useCallback(
    (requiredTier: SubscriptionTier): boolean => user ? checkAccess(user.subscriptionTier, requiredTier) : false,
    [user]
  );

  const isAdmin = user?.roles?.includes('admin') ?? false;

  // runtime token monitor
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

  // app-ready event
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

export default AuthProvider;
