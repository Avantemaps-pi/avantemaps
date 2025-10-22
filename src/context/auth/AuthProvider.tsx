
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { toast } from 'sonner';
import { initializePiNetwork } from '@/utils/piNetwork';
import { PiUser, AuthContextType, STORAGE_KEY } from './types';
import { checkAccess } from './authUtils';
import { performLogin, refreshUserData as refreshUserDataService, requestAuthPermissions } from './authService';
import { useNetworkStatus } from './networkStatusService';
import { SubscriptionTier } from '@/utils/piNetwork/types';
import { shouldBypassAuth, DEV_CONFIG } from '@/config/environment';
import AuthContext from './useAuth';
import { secureLog } from '@/utils/secureLogger';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<PiUser | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isSdkInitialized, setIsSdkInitialized] = useState<boolean>(false);
  const [lastRefresh, setLastRefresh] = useState<number>(0);
  const pendingAuthRef = useRef<boolean>(false);
  const initAttempted = useRef<boolean>(false);
  const authTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const devModeToastShown = useRef<boolean>(false);
  
  // Minimum time between refresh calls (15 minutes)
  const REFRESH_COOLDOWN = 15 * 60 * 1000;
  // Increased timeout to 45 seconds for better reliability
  const AUTH_TIMEOUT = 45 * 1000;

  // ✅ Checks if Pi access token is still valid
  const isTokenValid = async (accessToken: string): Promise<boolean> => {
    try {
      const response = await fetch("https://api.minepi.com/v2/me", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      return response.ok; // returns true if token is still valid
    } catch (error) {
      console.error("Token validation error:", error);
      return false;
    }
  };
  
  // Check for cached session on mount
  useEffect(() => {
    // In development mode, bypass authentication
    if (shouldBypassAuth()) {
      secureLog.info("Development mode: bypassing authentication");
      const mockUser = { ...DEV_CONFIG.mockUser, lastAuthenticated: Date.now() };
      setUser(mockUser);
      // Ensure dev user exists in database
      import('@/context/auth/authUtils').then(({ updateUserData }) => {
        updateUserData(mockUser, setUser).catch(err => 
          secureLog.warn("Failed to create dev user in database:", err)
        );
      });
      return;
    }

    const cachedSession = localStorage.getItem(STORAGE_KEY);
    
    if (cachedSession) {
      try {
        const userData = JSON.parse(cachedSession) as PiUser;
        // Check if the session is still relatively fresh (less than 24 hours old)
        if (Date.now() - userData.lastAuthenticated < 24 * 60 * 60 * 1000) {
          secureLog.info("Restoring user from cached session");
          setUser(userData);
        } else {
          secureLog.info("Cached session expired");
          localStorage.removeItem(STORAGE_KEY);
        }
      } catch (error) {
        secureLog.error("Error parsing cached session:", error);
        localStorage.removeItem(STORAGE_KEY);
      }
    }
  }, []);

  // Initialize Pi Network SDK efficiently
  useEffect(() => {
    if (initAttempted.current) return;
    
    initAttempted.current = true;
    const initSdk = async () => {
      try {
        secureLog.info("Starting Pi Network SDK initialization...");
        const result = await initializePiNetwork();
        setIsSdkInitialized(result);
        secureLog.info("Pi Network SDK initialization complete:", result);
      } catch (error) {
        secureLog.error("Failed to initialize Pi Network SDK:", error);
        toast.error("Failed to initialize Pi Network SDK. Some features may be unavailable.");
        setIsSdkInitialized(false);
      }
    };
    
    initSdk();
  }, []);

  // Optimized login process
  const login = useCallback(async (): Promise<void> => {
    // In development mode, automatically set mock user
    if (shouldBypassAuth()) {
      secureLog.info("Development mode: setting mock user");
      const mockUser = { ...DEV_CONFIG.mockUser, lastAuthenticated: Date.now() };
      setUser(mockUser);
      // Ensure dev user exists in database
      import('@/context/auth/authUtils').then(({ updateUserData }) => {
        updateUserData(mockUser, setUser).catch(err => 
          secureLog.warn("Failed to create dev user in database:", err)
        );
      });
      // Only show toast once
      if (!devModeToastShown.current) {
        toast.success("Development mode: Logged in as mock user");
        devModeToastShown.current = true;
      }
      return;
    }

    if (pendingAuthRef.current) {
      console.log("Authentication already in progress");
      toast.info("Authentication in progress, please wait...");
      return;
    }

    pendingAuthRef.current = true;
    setIsLoading(true);
    
    // Reset any existing timeout
    if (authTimeoutRef.current) {
      clearTimeout(authTimeoutRef.current);
    }
    
    // Set new authentication timeout
    authTimeoutRef.current = setTimeout(() => {
      setIsLoading(false);
      setAuthError("Authentication is taking longer than expected. Please check your connection and try again.");
      toast.error("Authentication timeout. Please ensure you have a stable internet connection and try again.", {
        duration: 6000,
      });
      pendingAuthRef.current = false;
    }, AUTH_TIMEOUT);
    
    try {
      // Initialize SDK if needed
      if (!isSdkInitialized) {
        secureLog.info("Attempting to initialize SDK before login...");
        try {
          const result = await initializePiNetwork();
          setIsSdkInitialized(result);
          if (!result) {
            throw new Error("SDK initialization failed");
          }
        } catch (error) {
          secureLog.error("Failed to initialize Pi Network SDK during login:", error);
          toast.error("Failed to initialize Pi Network SDK. Please try again later.");
          pendingAuthRef.current = false;
          setIsLoading(false);
          if (authTimeoutRef.current) {
            clearTimeout(authTimeoutRef.current);
          }
          return;
        }
      }
      
      // First step: Request permissions
      const permissionsGranted = await requestAuthPermissions(
        isSdkInitialized, 
        setIsLoading, 
        setAuthError
      );
      
      if (!permissionsGranted) {
        console.log("Permissions not granted. Authentication aborted.");
        pendingAuthRef.current = false;
        setIsLoading(false);
        if (authTimeoutRef.current) {
          clearTimeout(authTimeoutRef.current);
          authTimeoutRef.current = null;
        }
        return;
      }
      
      // Second step: Authenticate with Pi Network
      await performLogin(
        isSdkInitialized,
        setIsLoading,
        setAuthError,
        (pending) => { pendingAuthRef.current = pending; },
        setUser
      );
      
      // Update last refresh timestamp
      setLastRefresh(Date.now());
    } catch (error) {
      console.error("Login process error:", error);
      const errorMsg = error instanceof Error ? error.message : "Authentication failed. Please try again.";
      toast.error(errorMsg, {
        duration: 6000,
      });
      pendingAuthRef.current = false;
    } finally {
      // Clear authentication timeout
      if (authTimeoutRef.current) {
        clearTimeout(authTimeoutRef.current);
        authTimeoutRef.current = null;
      }
      setIsLoading(false);
    }
  }, [isSdkInitialized, AUTH_TIMEOUT]);

  // Handle online/offline status
  const isOffline = useNetworkStatus(pendingAuthRef, login);

  // Refresh user data without full login
  const refreshUserData = useCallback(async (force: boolean = false): Promise<void> => {
    // Skip refresh if called too frequently unless forced
    const now = Date.now();
    if (!force && now - lastRefresh < REFRESH_COOLDOWN) {
      console.log("Skipping refresh, too soon since last refresh");
      return;
    }
    
    if (!isSdkInitialized) {
      try {
        const result = await initializePiNetwork();
        setIsSdkInitialized(result);
      } catch (error) {
        console.error("Failed to initialize Pi Network SDK during refresh:", error);
        return;
      }
    }
    
    if (!user) {
      secureLog.info("No user to refresh data for");
      return;
    }
    
    secureLog.info("Refreshing user data...");
    setIsLoading(true);
    try {
      const stillValid = await isTokenValid(user?.accessToken ?? "");
    
      if (!stillValid) {
        secureLog.warn("Access token expired — reauthenticating via Pi Network...");
        await login(); // 🔄 Trigger a new Pi login
        return;
      }
    
      await refreshUserDataService(user, setUser, setIsLoading);
      secureLog.info("User data refreshed successfully");
      setLastRefresh(now);
    } catch (error) {
      secureLog.error("Failed to refresh user data:", error);
    } finally {
      setIsLoading(false);
    }
  }, [user, isSdkInitialized, lastRefresh]);
  
  // Silent refresh when app starts or becomes online
  useEffect(() => {
    if (user && !isOffline && isSdkInitialized) {
      // Use setTimeout to avoid refreshing immediately during initial render
      const timer = setTimeout(() => {
        refreshUserData(false);
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [user, isOffline, isSdkInitialized, refreshUserData]);

  const logout = (): void => {
    localStorage.removeItem(STORAGE_KEY);
    setUser(null);
    toast.info("You've been logged out");
  };

  // Check if user has access to a feature based on their subscription
  const hasAccess = useCallback((requiredTier: SubscriptionTier): boolean => {
    if (!user) return false;
    return checkAccess(user.subscriptionTier, requiredTier);
  }, [user]);

  // ✅ Runtime token monitor (runs every 10 minutes)
  useEffect(() => {
    if (!user?.accessToken) return;
  
    const interval = setInterval(async () => {
      const stillValid = await isTokenValid(user.accessToken);
      if (!stillValid) {
        secureLog.warn("Runtime check: token expired, triggering re-login");
        await login();
      }
    }, 10 * 60 * 1000); // 10 minutes
  
    return () => clearInterval(interval);
  }, [user, login]);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        isOffline,
        login,
        logout,
        authError,
        hasAccess,
        refreshUserData: () => refreshUserData(true)
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
