import { toast } from 'sonner';
import { PiUser } from './types';
import {
  isPiNetworkAvailable,
  initializePiNetwork,
  isPiBrowser
} from '@/utils/piNetwork';
import { SubscriptionTier } from '@/utils/piNetwork/types';
import { getUserSubscription, updateUserData } from './authUtils';
import { secureLog } from '@/utils/secureLogger';
import { verifyPiAuthentication, getDetailedAuthError } from '@/utils/piNetwork/verification';
import { supabase } from '@/integrations/supabase/client';
import { shouldBypassAuth, DEV_CONFIG } from '@/config/environment';
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
      // Check if we're in Pi Browser (isPiBrowser checks UA + SDK presence)
      const host = window.location.hostname;
      const hasPiSdk = typeof window.Pi !== 'undefined';
      const uaPiBrowser = isPiBrowser();
      const inPiBrowser = uaPiBrowser;
      
      // Log detection results for debugging
      secureLog.info("🔍 Browser detection:", {
        userAgent: navigator.userAgent,
        uaPiBrowser,
        inPiBrowser,
        hostname: host,
        hasPiSdk,
        
      });
      
      // PRODUCTION: Require Pi Browser - no fallback to test mode (but allow robust detection)
      if (!inPiBrowser) {
        const errorMsg = "This app requires the Pi Browser. Please open it in the official Pi Browser app to continue.";
        secureLog.warn("❌ Not in Pi Browser - authentication blocked", { host, hasPiSdk, uaPiBrowser });
        setAuthError(errorMsg);
        toast.error(errorMsg);
        setIsLoading(false);
        setPendingAuth(false);
        return;
      }
      
      // Real Pi Browser authentication
      if (!isPiNetworkAvailable() || !window.Pi) {
        secureLog.warn("Pi SDK not detected — prompting user to open in Pi Browser.");
        setAuthError("Please open this app in the Pi Browser to log in.");
        toast.error("Please open this app in the Pi Browser to log in.");
        setIsLoading(false);
        setPendingAuth(false);
        return;
      }

      // Request permission + authenticate with Pi SDK (with timeout)
      secureLog.info("Requesting Pi Network authentication with scopes: username, payments, wallet_address");

      if (!window.Pi) {
        throw new Error("Pi SDK not loaded. Please open this app in the Pi Browser or reload the page.");
      }

      // Show progress indicator
      toast.info('Connecting to Pi Network...', { id: 'auth-progress', duration: 120000 });
      
      const authPromise = new Promise<any>((resolve, reject) => {
        // Increased timeout to 120 seconds - Pi SDK can be slow on mobile/slow connections or user approval
        const authTimeout = setTimeout(() => {
          toast.dismiss('auth-progress');
          reject(new Error('Authentication request timed out. Please check your connection and try again.'));
        }, 120000);

        try {
          // ✅ Defensive check before calling Pi.authenticate
          if (!window.Pi || typeof window.Pi.authenticate !== 'function') {
            clearTimeout(authTimeout);
            reject(new Error("Pi SDK not loaded yet. Please refresh the page or try again."));
            return;
          }
          
          secureLog.info("📱 Calling Pi.authenticate()...");
          toast.info('Waiting for Pi Browser approval...', { id: 'auth-progress', duration: 120000 });
        
          window.Pi.authenticate(['username', 'payments', 'wallet_address'], (payment) => {
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
            toast.info('Verifying authentication...', { id: 'auth-progress', duration: 30000 });
            secureLog.info("📱 Pi.authenticate() resolved successfully");
            resolve(res);
          })
          .catch((err: any) => {
            clearTimeout(authTimeout);
            toast.dismiss('auth-progress');
            console.error('❌ Pi SDK authentication error:', {
              error: err,
              errorType: err?.constructor?.name,
              message: err instanceof Error ? err.message : 'Unknown error'
            });
            reject(err);
          });
        } catch (err) {
          clearTimeout(authTimeout);
          toast.dismiss('auth-progress');
          secureLog.error("❌ Exception calling Pi.authenticate():", err);
          reject(err);
        }
      });

      const authResult = await authPromise;
      secureLog.info("✅ Pi SDK authentication successful", { 
        uid: authResult?.user?.uid,
        username: authResult?.user?.username,
        hasAccessToken: !!authResult?.accessToken
      });

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

      
      // Always verify with backend to establish Supabase session (PRODUCTION ONLY)
      let verificationSucceeded = false;
      
      {
        // Immediately verify with backend (do not persist token)
        secureLog.info("Verifying token with backend", {
          uid: authResult.user.uid,
          username: authResult.user.username,
          tokenLen: authResult.accessToken.length
        });

        // Attempt backend verification but don't fail authentication if it's just a network issue
        try {
          secureLog.info("🔐 Verifying authentication with backend...");
          const verificationResult = await verifyPiAuthentication(
            authResult.accessToken,
            authResult.user.uid,
            authResult.user.username
          );

        secureLog.info("✅ Backend verification result:", {
          verified: verificationResult.verified,
          hasToken: !!(verificationResult as any).supabase_token,
          hasTraceId: !!(verificationResult as any).traceId
        });

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
          secureLog.error("❌ Verification failed:", {
            verified: verificationResult.verified,
            error: (verificationResult as any).error,
            details: (verificationResult as any).details,
            reason
          });

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
            
            // 🔧 Set Supabase session with BOTH access + refresh token
            const token =
              (verificationResult as any).supabase_token ??
              verificationResult.supabaseToken ??
              (verificationResult as any).supabaseToken;

            const refreshToken =
              (verificationResult as any).refresh_token ??
              (verificationResult as any).refreshToken ??
              verificationResult.refreshToken;

            if (!token) {
              secureLog.warn('⚠️ No supabase_token returned from verification');
            } else if (!refreshToken || refreshToken.trim() === '' || refreshToken.trim() === token.trim()) {
              // Only reject if refresh token is completely missing or same as access token
              secureLog.error('❌ Missing/invalid refresh token returned from verification', {
                hasRefreshToken: !!refreshToken,
                refreshIsEmpty: !refreshToken?.trim(),
                refreshEqualsAccess: refreshToken?.trim() === token.trim(),
              });
              throw new Error('Session setup failed: missing refresh token');
            } else {
              // Clear any existing session first to avoid mixing tokens
              await supabase.auth.signOut();

              const sessionPayload: { access_token: string; refresh_token: string } = {
                access_token: token.trim(),
                refresh_token: refreshToken.trim(),
              };

              secureLog.info('Setting Supabase session with JWT token', { hasRefreshToken: true });
              const { error: sessionError } = await supabase.auth.setSession(sessionPayload);

              if (sessionError) {
                console.error('❌ Failed to set Supabase session:', {
                  error: sessionError,
                  message: sessionError.message,
                  status: sessionError.status,
                });
                secureLog.error('Failed to set Supabase session:', sessionError);
                throw new Error('Failed to establish secure session. Please try again.');
              }

              secureLog.info('✅ Supabase session established successfully');
            }
          }
        } catch (verificationError) {
        const errorMsg = verificationError instanceof Error ? verificationError.message : String(verificationError);
        secureLog.warn("💥 Backend verification threw error:", {
          error: verificationError,
          message: errorMsg,
          type: verificationError?.constructor?.name,
          stack: verificationError instanceof Error ? verificationError.stack : undefined
        });
        
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

      // Fetch roles from database (roles will be updated in updateUserData)
      const userData: PiUser = {
        uid: authResult.user.uid,
        username: authResult.user.username,
        walletAddress,
        roles: safeRoles,
        // IMPORTANT: do NOT include accessToken here
        lastAuthenticated: Date.now(),
        subscriptionTier
      };

      // Persist user meta (will fetch and set roles from database)
      await updateUserData(userData, setUser);

      toast.dismiss('auth-progress');
      toast.success(`Welcome back, ${userData.username}!`);
      secureLog.info("User stored and login complete");

      // success -> exit function
      return;
    } catch (err) {
      const { message, userMessage } = getDetailedAuthError(err);
      secureLog.error("💥 Authentication attempt failed", { 
        attempt: authAttempt + 1,
        maxAttempts: maxAuthAttempts,
        error: err,
        errorType: err?.constructor?.name,
        message,
        userMessage,
        stack: err instanceof Error ? err.stack : undefined
      });

      // If attempts remain, increment and retry
      if (authAttempt < maxAuthAttempts) {
        authAttempt++;
        secureLog.info(`🔄 Retrying authentication (${authAttempt}/${maxAuthAttempts})`);
        await new Promise(r => setTimeout(r, 300));
        continue;
      }

      // Final failure: surface friendly message to user
      setAuthError(userMessage);
      toast.error(userMessage, { duration: 6000 });
      secureLog.error("❌ Final authentication error surfaced to user:", {
        userMessage,
        attempts: authAttempt + 1
      });
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
