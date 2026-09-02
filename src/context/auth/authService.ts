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
import { recordReauthEvent } from '@/utils/telemetry/reauthTelemetry';

/** Ceiling for a single Pi.authenticate() handshake. */
export const PI_AUTH_TIMEOUT_MS = 60_000;

/** Timeouts are terminal — retrying a hung handshake only multiplies the wait. */
class AuthTimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthTimeoutError';
  }
}
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
      
      const authStartedAt = Date.now();
      let paymentCallbackFired = false;
      let timedOut = false;

      const authPromise = new Promise<any>((resolve, reject) => {
        // 60s: long enough for a real human approval in Pi Browser, short enough
        // that a hung handshake surfaces a visible error instead of stalling.
        const authTimeout = setTimeout(() => {
          timedOut = true;
          toast.dismiss('auth-progress');
          recordReauthEvent('pi_auth_timeout', {
            isRetry: authAttempt > 0,
            message: "Pi.authenticate() didn't resolve or reject within the 60s window",
            metadata: {
              elapsedMs: Date.now() - authStartedAt,
              paymentCallbackFired,
              piPresent: !!window.Pi,
              piAuthenticateIsFunction: typeof window.Pi?.authenticate === 'function',
              authAttempt,
            },
          });
          reject(new AuthTimeoutError('Pi Network didn\'t respond. Please make sure you approved the request in Pi Browser, then try again.'));
        }, PI_AUTH_TIMEOUT_MS);

        try {
          // ✅ Defensive check before calling Pi.authenticate
          if (!window.Pi || typeof window.Pi.authenticate !== 'function') {
            clearTimeout(authTimeout);
            reject(new Error("Pi SDK not loaded yet. Please refresh the page or try again."));
            return;
          }

          // Captured explicitly (rather than assumed from the check above) so the
          // pi_auth_timeout event can record what was actually true right before
          // the call, in case window.Pi changes state in the 60s that follow.
          const piPresentAtCallTime = !!window.Pi;
          const piAuthenticateIsFunctionAtCallTime = typeof window.Pi.authenticate === 'function';

          secureLog.info("📱 Calling Pi.authenticate()...");
          toast.info('Waiting for Pi Browser approval...', { id: 'auth-progress', duration: 120000 });

          window.Pi.authenticate(['username', 'payments', 'wallet_address'], (payment: unknown) => {
            paymentCallbackFired = true;
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
            recordReauthEvent('pi_auth_resolved', {
              authUid: res?.user?.uid ?? null,
              isRetry: authAttempt > 0,
              message: 'Pi.authenticate() resolved successfully',
              metadata: {
                elapsedMs: Date.now() - authStartedAt,
                timedOutBeforeResolve: timedOut,
              },
            });
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
            if (!timedOut) {
              recordReauthEvent(
                'pi_auth_error',
                {
                  isRetry: authAttempt > 0,
                  message: 'Pi.authenticate() rejected before the 60s timeout fired',
                  metadata: {
                    elapsedMs: Date.now() - authStartedAt,
                    paymentCallbackFired,
                    piPresentAtCallTime,
                    piAuthenticateIsFunctionAtCallTime,
                    errorType: err?.constructor?.name ?? null,
                  },
                },
                err,
              );
            }
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
      let verificationResult: any = null;
      
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
          verificationResult = await verifyPiAuthentication(
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

          // For network errors, treat as a real failure (no valid Supabase session was established)
          if (reason.includes('network') || reason.includes('connection') || reason.includes('timeout')) {
            secureLog.warn("Backend verification failed due to network issue; treating as auth failure");
            throw new Error("Couldn't reach the server to verify your login. Please check your connection and try again.");
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
          secureLog.warn("Network error during verification; treating as auth failure so retry loop can run");
          // Re-throw so the outer catch handles retry/backoff and surfaces a clean error to the user.
          // Do NOT fall through to the success path — no valid Supabase session exists here.
          throw new Error("Couldn't reach the server to verify your login. Please check your connection and try again.");
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
      const walletAddress =
        verificationResult?.user?.wallet_address ??
        (authResult.user as any).wallet_address ??
        null;

      // CRITICAL: uid MUST be the Supabase UUID (auth.uid()), not the Pi UID.
      // RLS-protected mutations (e.g. starting a conversation) compare this
      // against supabase.auth.getSession().user.id; a mismatch triggers a
      // re-auth loop and prevents navigation to /communicon.
      const supabaseUid: string =
        verificationResult?.user?.uid ?? authResult.user.uid;
      const piUid: string =
        verificationResult?.user?.pi_uid ?? authResult.user.uid;

      let subscriptionTier: SubscriptionTier = SubscriptionTier.INDIVIDUAL;
      try {
        subscriptionTier = await getUserSubscription(supabaseUid);
      } catch (err) {
        secureLog.info("User not found in DB; defaulting subscription tier to INDIVIDUAL");
      }

      // Fetch roles from database (roles will be updated in updateUserData)
      const userData: PiUser = {
        uid: supabaseUid,
        pi_uid: piUid,
        username: verificationResult?.user?.username ?? authResult.user.username,
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

      const isTerminal = err instanceof AuthTimeoutError;

      // If attempts remain, increment and retry — but never re-run a hung
      // handshake: that pushes the user's first error message minutes out.
      if (!isTerminal && authAttempt < maxAuthAttempts) {
        authAttempt++;
        secureLog.info(`🔄 Retrying authentication (${authAttempt}/${maxAuthAttempts})`);
        await new Promise(r => setTimeout(r, 300));
        continue;
      }

      // Final failure: surface friendly message to user
      const finalMessage = isTerminal && err instanceof Error ? err.message : userMessage;
      toast.dismiss('auth-progress');
      setAuthError(finalMessage);
      toast.error(finalMessage, { duration: 6000 });
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
  setIsLoading: (loading: boolean) => void,
  silent = false
): Promise<void> => {
  if (!user) return;

  try {
    setIsLoading(true);

    // Check existing Supabase session validity — do NOT re-authenticate with Pi.
    // The Pi access token is intentionally not stored client-side, so calling
    // window.Pi.authenticate() here would mint a new token that mismatches the
    // current Supabase session.
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session?.access_token) {
      secureLog.warn('Silent refresh: no valid Supabase session; skipping refresh', sessionError);
      return;
    }
    const tokenExpiry = session.expires_at ? session.expires_at * 1000 : 0;
    if (tokenExpiry && Date.now() > tokenExpiry) {
      secureLog.warn('Silent refresh: Supabase session expired; skipping refresh');
      return;
    }

    // Fetch current subscription tier from the database
    const subscriptionTier = await getUserSubscription(user.uid);

    // updateUserData re-fetches roles from the database internally
    await updateUserData({ ...user, subscriptionTier }, setUser);
  } catch (error) {
    if (silent) {
      secureLog.warn("Error refreshing user data (silent):", error);
    } else {
      secureLog.error("Error refreshing user data:", error);
    }
  } finally {
    setIsLoading(false);
  }
};
