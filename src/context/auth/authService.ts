import { toast } from 'sonner';
import { PiUser } from './types';
import {
  isPiNetworkAvailable,
  initializePiNetwork
} from '@/utils/piNetwork';
import { SubscriptionTier } from '@/utils/piNetwork/types';
import { getUserSubscription, updateUserData } from './authUtils';
import { secureLog } from '@/utils/secureLogger';
import { verifyPiAuthentication, getDetailedAuthError } from '@/utils/piNetwork/verification';

// Simplified permission check - actual permissions are requested during authentication
export const requestAuthPermissions = async (
  isSdkInitialized: boolean,
  setIsLoading: (loading: boolean) => void,
  setAuthError: (error: string | null) => void
): Promise<boolean> => {
  try {
    setIsLoading(true);
    setAuthError(null);

    // Check if online
    if (!navigator.onLine) {
      toast.warning("You're offline. Authentication will resume when you're back online.");
      setIsLoading(false);
      return false;
    }

    // Check if Pi SDK is available
    if (!isPiNetworkAvailable()) {
      const errorMessage = "Pi Network SDK is not available. Please use the official Pi Browser app.";
      secureLog.warn(errorMessage);
      setAuthError(errorMessage);
      toast.error(errorMessage);
      setIsLoading(false);
      return false;
    }

    // SDK is available, user can proceed with authentication
    secureLog.info("Pi SDK is available and ready");
    return true;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Permission check failed";
    secureLog.error("Permission check error:", error);
    setAuthError(errorMessage);
    toast.error(errorMessage);
    return false;
  } finally {
    setIsLoading(false);
  }
};

// Optimized login with better error handling and timeout management
export const performLogin = async (
  isSdkInitialized: boolean,
  setIsLoading: (loading: boolean) => void,
  setAuthError: (error: string | null) => void,
  setPendingAuth: (pending: boolean) => void,
  setUser: (user: PiUser | null) => void
): Promise<void> => {
  let authAttempt = 0;
  const maxAuthAttempts = 2;

  // Ensure SDK is initialized first (same semantics as yours)
  if (!isSdkInitialized) {
    setPendingAuth(true);
    try {
      secureLog.info("Initializing Pi SDK before login...");
      const initialized = await initializePiNetwork();
      if (!initialized) {
        setIsLoading(false);
        setPendingAuth(false);
        setAuthError("SDK initialization failed");
        toast.warning("Could not initialize Pi Network. Please try again.");
        return;
      }
    } catch (err) {
      secureLog.error("SDK initialization failed:", err);
      setIsLoading(false);
      setPendingAuth(false);
      setAuthError("SDK initialization failed");
      toast.error("Failed to initialize Pi Network SDK. Please try again.");
      return;
    }
  }

  // Main retry loop
  while (authAttempt <= maxAuthAttempts) {
    setAuthError(null);
    setIsLoading(true);
    setPendingAuth(true);

    try {
      // offline / SDK checks
      if (!navigator.onLine) {
        toast.warning("You're offline. Authentication will resume when you're back online.");
        setIsLoading(false);
        setPendingAuth(false);
        return;
      }
      if (!isPiNetworkAvailable()) {
        throw new Error("Pi Network SDK is not available");
      }

      // Request permission + authenticate with Pi SDK (with timeout)
      secureLog.info("Requesting Pi Network authentication with scopes: username, payments, wallet_address");

      const authPromise = new Promise<any>((resolve, reject) => {
        const authTimeout = setTimeout(() => {
          reject(new Error('Authentication request timed out. Please try again.'));
        }, 8000);

        try {
          window.Pi!.authenticate(['username', 'payments', 'wallet_address'], (payment) => {
            secureLog.info('Incomplete payment detected during authentication');
            try {
              if (window.sessionStorage) {
                window.sessionStorage.setItem('pi_incomplete_payment', JSON.stringify(payment));
              }
            } catch (e) {
              secureLog.warn('Failed to store incomplete payment in sessionStorage', e);
            }
          })
          .then((res: any) => {
            clearTimeout(authTimeout);
            resolve(res);
          })
          .catch((err: any) => {
            clearTimeout(authTimeout);
            reject(err);
          });
        } catch (err) {
          clearTimeout(authTimeout);
          reject(err);
        }
      });

      const authResult = await authPromise;
      secureLog.info("Authentication result received", { hasUser: !!authResult?.user, hasToken: !!authResult?.accessToken });

        if (!authResult || !authResult.user || !authResult.accessToken) {
        const errorMsg = "Authentication response was incomplete. Please try again.";
        secureLog.error("Incomplete auth result:", { hasAuthResult: !!authResult, hasUser: !!authResult?.user, hasToken: !!authResult?.accessToken });
        if (authAttempt < maxAuthAttempts) {
          authAttempt++;
          await new Promise(r => setTimeout(r, 300));
          continue;
        }
        throw new Error(errorMsg);
      }

      // Skip backend verification in development mode to speed up auth
      const isDevelopment = import.meta.env.DEV;
      let verificationSucceeded = false;
      
      if (isDevelopment) {
        secureLog.info("Development mode: Skipping backend verification");
        verificationSucceeded = true;
      } else {
        // Immediately verify with backend (do not persist token)
        secureLog.info("Verifying token with backend", {
          uid: authResult.user.uid,
          username: authResult.user.username,
          tokenLen: authResult.accessToken.length
        });

        // Attempt backend verification but don't fail authentication if it's just a network issue
        try {
          const verificationResult = await verifyPiAuthentication(
            authResult.accessToken,
            authResult.user.uid,
            authResult.user.username
          );

        // Capture traceId from Supabase Edge Function if available
        if ((verificationResult as any).traceId) {
          secureLog.info(`🔗 Supabase verification traceId: ${(verificationResult as any).traceId}`);
          if (secureLog.setTraceId) {
            secureLog.setTraceId((verificationResult as any).traceId);
          }
        } else {
          secureLog.warn("⚠️ No traceId returned from Supabase verification");
        }
        
        // If backend explicitly requests reauth, retry once
        if (!verificationResult.verified && (verificationResult as any).needsReauth && authAttempt < maxAuthAttempts) {
          secureLog.warn("Backend requested re-auth. Retrying authenticate()");
          authAttempt++;
          await new Promise(r => setTimeout(r, 300));
          continue;
        }

        if (!verificationResult.verified) {
          const reason = (verificationResult.details || verificationResult.error || '').toLowerCase();
          secureLog.error("Verification failed:", verificationResult);

          // Only retry for expired/invalid tokens, not network errors
          if ((reason.includes('expired') || reason.includes('invalid')) && authAttempt < maxAuthAttempts) {
            secureLog.warn("Detected expired or invalid token — forcing re-authentication...");
            authAttempt++;
            await new Promise(r => setTimeout(r, 300));
            continue;
          }

          // For network errors, allow login with warning
          if (reason.includes('network') || reason.includes('connection') || reason.includes('timeout')) {
            secureLog.warn("Backend verification failed due to network issue, allowing login with warning");
            toast.warning("Authentication succeeded but couldn't verify with server. Some features may be limited.");
            verificationSucceeded = false; // Continue without server verification
          } else {
            // For other errors, fail the authentication
            throw new Error(verificationResult.details || verificationResult.error || "Verification failed");
          }
          } else {
            verificationSucceeded = true;
          }
        } catch (verificationError) {
        const errorMsg = verificationError instanceof Error ? verificationError.message : String(verificationError);
        secureLog.warn("Backend verification threw error:", errorMsg);
        
        // Check if it's a network-related error
        if (errorMsg.toLowerCase().includes('network') || 
            errorMsg.toLowerCase().includes('fetch') || 
            errorMsg.toLowerCase().includes('connection') ||
            errorMsg.toLowerCase().includes('timeout')) {
          secureLog.warn("Network error during verification, allowing login with warning");
          toast.warning("Couldn't verify with server due to network issue. Some features may be limited.");
          verificationSucceeded = false;
        } else {
          // For non-network errors, re-throw
          throw verificationError;
          }
        }
      }

      if (verificationSucceeded) {
        secureLog.info("Authentication verified successfully with backend");
      } else {
        secureLog.info("Authentication completed without backend verification (offline mode)");
      }

      // Build user object WITHOUT accessToken (do NOT store accessToken client-side)
      const safeRoles = (authResult.user.roles ?? []) as string[];
      const walletAddress = (authResult.user as any).wallet_address ?? null;

      let subscriptionTier: SubscriptionTier = SubscriptionTier.INDIVIDUAL;
      try {
        subscriptionTier = await getUserSubscription(authResult.user.uid);
      } catch (err) {
        secureLog.info("User not found in DB; defaulting subscription tier to INDIVIDUAL");
      }

      const userData: PiUser = {
        uid: authResult.user.uid,
        username: authResult.user.username,
        walletAddress,
        roles: safeRoles,
        // IMPORTANT: do NOT include accessToken here
        lastAuthenticated: Date.now(),
        subscriptionTier
      };

      // Persist user meta (the server-side updateUserData should not persist access tokens)
      await updateUserData(userData, setUser);

      toast.success(`Welcome back, ${userData.username}!`);
      secureLog.info("User stored and login complete");

      // success -> exit function
      return;
    } catch (err) {
      const { message, userMessage } = getDetailedAuthError(err);
      secureLog.error("Authentication attempt failed", { attempt: authAttempt + 1, message });

      // If attempts remain, increment and retry
      if (authAttempt < maxAuthAttempts) {
        authAttempt++;
        secureLog.info(`Retrying authentication (${authAttempt}/${maxAuthAttempts})`);
        await new Promise(r => setTimeout(r, 300));
        continue;
      }

      // Final failure: surface friendly message to user
      setAuthError(userMessage);
      toast.error(userMessage, { duration: 6000 });
      secureLog.error("Final authentication error surfaced to user:", userMessage);
      return;
    } finally {
      // Ensure flags are reset after each attempt
      setIsLoading(false);
      setPendingAuth(false);
    }
  }
};

// Simplified refresh function with improved error handling
export const refreshUserData = async (
  user: PiUser | null,
  setUser: (user: PiUser) => void,
  setIsLoading: (loading: boolean) => void
): Promise<void> => {
  if (!user) return;

  try {
    setIsLoading(true);

    // Ensure SDK is initialized before proceeding
    try {
      await initializePiNetwork();
    } catch (error) {
      secureLog.error("Failed to initialize Pi Network SDK during refresh:", error);
      return;
    }

    // Get user's current subscription
    const subscriptionTier = await getUserSubscription(user.uid);

    // Attempt a silent refresh only if SDK is available
    if (isPiNetworkAvailable()) {
      secureLog.info("Refreshing user permissions with authenticate (silent) - scopes: username, payments, wallet_address");
      try {
        const authResult = await window.Pi!.authenticate(['username', 'payments', 'wallet_address'], (payment) => {
          secureLog.info('Incomplete payment found during refresh', payment);
          try {
            if (window.sessionStorage) {
              window.sessionStorage.setItem('pi_incomplete_payment', JSON.stringify(payment));
            }
          } catch (e) {
            secureLog.warn('Failed to store incomplete payment during refresh', e);
          }
        });

        if (authResult && authResult.user) {
          // Update Pi SDK currentUser read-only (no token stored)
          if (window.Pi) {
            try {
              Object.defineProperty(window.Pi, 'currentUser', {
                value: Object.freeze({
                  uid: authResult.user.uid,
                  username: authResult.user.username,
                  roles: Object.freeze((authResult.user.roles ?? []) as string[])
                }),
                writable: false,
                configurable: false
              });
            } catch (e) {
              secureLog.warn('Could not set window.Pi.currentUser (refresh)', e);
            }
          }

          const walletAddress = (authResult.user as any).wallet_address;
          const updated = {
            ...user,
            walletAddress: walletAddress || user.walletAddress,
            subscriptionTier
          };

          await updateUserData(updated, setUser);
          toast.success("User profile updated");
        } else {
          // If authResult not provided, just update subscription tier if changed
          if (user.subscriptionTier !== subscriptionTier) {
            await updateUserData({
              ...user,
              subscriptionTier
            }, setUser);
          }
        }
      } catch (err) {
        secureLog.error("Silent refresh authenticate failed:", err);
        // Do not surface toast on silent refresh failure
      }
    } else {
      // Just update the subscription if offline or SDK not available
      if (user.subscriptionTier !== subscriptionTier) {
        await updateUserData({
          ...user,
          subscriptionTier
        }, setUser);
      }
    }
  } catch (error) {
    secureLog.error("Error refreshing user data:", error);
    toast.error("Failed to refresh user data. Please try again.");
  } finally {
    setIsLoading(false);
  }
};
