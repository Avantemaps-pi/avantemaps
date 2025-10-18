
import { toast } from 'sonner';
import { PiUser } from './types';
import {
  isPiNetworkAvailable,
  initializePiNetwork,
  forceSdkReinitialization
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
      console.error(errorMessage);
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
    console.error("Permission check error:", errorMessage);
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
  
  // Initialize SDK if needed - before the auth flow starts
  if (!isSdkInitialized) {
    setPendingAuth(true);
    console.log("SDK not initialized during login attempt. Initializing now...");
    try {
      const initialized = await initializePiNetwork();
      if (!initialized) {
        toast.warning("Could not initialize Pi Network. Please try again.");
        setIsLoading(false);
        setPendingAuth(false);
        setAuthError("SDK initialization failed");
        return;
      }
    } catch (error) {
      console.error("SDK initialization error:", error);
      toast.error("Failed to initialize Pi Network SDK. Please try again.");
      setIsLoading(false);
      setPendingAuth(false);
      setAuthError("SDK initialization failed");
      return;
    }
  }
  
  while (authAttempt <= maxAuthAttempts) {
    if (authAttempt > 0) {
      console.log(`Retrying authentication (attempt ${authAttempt}/${maxAuthAttempts})...`);
      await new Promise(resolve => setTimeout(resolve, 1500)); // Brief pause between attempts
    }
    
    setIsLoading(true);
    setAuthError(null);

    try {
      // Check if online
      if (!navigator.onLine) {
        setPendingAuth(true);
        toast.warning("You're offline. Authentication will resume when you're back online.");
        setIsLoading(false);
        return;
      }

      // Check if Pi SDK is available
      if (!isPiNetworkAvailable()) {
        if (authAttempt < maxAuthAttempts) {
          authAttempt++;
          continue;
        }
        console.error("Pi Network SDK is not available");
        throw new Error("Pi Network SDK is not available");
      }

      // Authenticate with Pi Network with required scopes
      secureLog.info("Requesting Pi Network authentication with scopes: username, payments, wallet_address");
      
      // Create a promise with timeout for authentication - 15 seconds
      const authPromise = new Promise<any>((resolve, reject) => {
        const authTimeout = setTimeout(() => {
          reject(new Error('Authentication request timed out. Please try again.'));
        }, 15000);

        window.Pi!.authenticate(['username', 'payments', 'wallet_address'], (payment) => {
          secureLog.info('Incomplete payment detected during authentication');
          if (window.sessionStorage) {
            window.sessionStorage.setItem('pi_incomplete_payment', JSON.stringify(payment));
          }
        })
        .then(result => {
          clearTimeout(authTimeout);
          secureLog.info("Pi SDK authenticate() resolved successfully");
          resolve(result);
        })
        .catch(err => {
          clearTimeout(authTimeout);
          secureLog.error("Pi SDK authenticate() rejected:", err);
          reject(err);
        });
      });
      
      const authResult = await authPromise;
      secureLog.info("Authentication result received", { hasUser: !!authResult?.user, hasToken: !!authResult?.accessToken });

      if (!authResult || !authResult.user || !authResult.accessToken) {
        const errorMsg = "Authentication response was incomplete. Please try again.";
        secureLog.error("Incomplete auth result:", { 
          hasAuthResult: !!authResult, 
          hasUser: !!authResult?.user, 
          hasToken: !!authResult?.accessToken 
        });
        if (authAttempt < maxAuthAttempts) {
          authAttempt++;
          continue;
        }
        throw new Error(errorMsg);
      }

      secureLog.info("Pi SDK authentication successful, verifying with backend...");

      const verificationResult = await verifyPiAuthentication(
        authResult.accessToken,
        authResult.user.uid,
        authResult.user.username
      );

      if (!verificationResult.verified) {
        secureLog.error("Backend verification failed:", verificationResult);
        if (authAttempt < maxAuthAttempts) {
          authAttempt++;
          continue;
        }
        // Use the detailed error message from verification
        throw new Error(verificationResult.details || verificationResult.error || "Could not verify Pi Network credentials");
      }

      secureLog.info("Authentication verified successfully with backend");
        
        // Store the current user in the window.Pi object for later use
      // Store user data in Pi SDK object as read-only to prevent manipulation
      if (window.Pi) {
        Object.defineProperty(window.Pi, 'currentUser', {
          value: Object.freeze({
            uid: authResult.user.uid,
            username: authResult.user.username,
            roles: Object.freeze([...authResult.user.roles])
          }),
          writable: false,
          configurable: false
        });
      }
        
        // Extract wallet address if available from user properties
        const authResultWithWallet = authResult as {
          user: {
            uid: string;
            username: string;
            roles?: string[];
            wallet_address?: string;
          };
          accessToken: string;
        };
        
        const walletAddress = authResultWithWallet.user.wallet_address;
        
        // Get user's subscription tier from Supabase (or default to INDIVIDUAL if user doesn't exist)
        let subscriptionTier: SubscriptionTier = SubscriptionTier.INDIVIDUAL;
        try {
          subscriptionTier = await getUserSubscription(authResult.user.uid);
        } catch (error) {
          console.log("User not found in database, will be created with INDIVIDUAL tier");
        }
        
        const userData: PiUser = {
          uid: authResult.user.uid,
          username: authResult.user.username,
          walletAddress: walletAddress, 
          roles: authResult.user.roles,
          accessToken: authResult.accessToken,
          lastAuthenticated: Date.now(),
          subscriptionTier
        };

        // Update Supabase and localStorage (this will create the user if they don't exist)
        await updateUserData(userData, setUser);
        
        toast.success(`Welcome back, ${userData.username}!`);
        return;
    } catch (error) {
      const { message, userMessage } = getDetailedAuthError(error);

      if (authAttempt < maxAuthAttempts) {
        console.log(`Authentication error (attempt ${authAttempt + 1}/${maxAuthAttempts + 1}): ${message}, retrying...`);
        authAttempt++;
        continue;
      }

      console.error("Auth error:", error);
      setAuthError(userMessage);
      toast.error(userMessage, {
        duration: 6000,
      });
    } finally {
      setPendingAuth(false);
      setIsLoading(false);
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
      console.error("Failed to initialize Pi Network SDK:", error);
      return;
    }
    
    // Get user's current subscription
    const subscriptionTier = await getUserSubscription(user.uid);

    // Request permissions again to ensure all required ones are granted
    if (isPiNetworkAvailable()) {
      secureLog.info("Refreshing user permissions with authenticate");
      const authResult = await window.Pi!.authenticate(['username', 'payments', 'wallet_address'], (payment) => {
        console.log('Incomplete payment found during refresh:', payment);
        // Store it to be handled later (use sessionStorage for security)
        if (window.sessionStorage) {
          window.sessionStorage.setItem('pi_incomplete_payment', JSON.stringify(payment));
        }
      });
      
      if (authResult) {
        // Store refreshed user data in Pi SDK object as read-only
        if (window.Pi) {
          Object.defineProperty(window.Pi, 'currentUser', {
            value: Object.freeze({
              uid: authResult.user.uid,
              username: authResult.user.username,
              roles: Object.freeze([...authResult.user.roles])
            }),
            writable: false,
            configurable: false
          });
        }
        
        // Extract wallet address if available
        const authResultWithWallet = authResult as any;
        const walletAddress = authResultWithWallet.user.wallet_address;
        
        await updateUserData({
          ...user,
          walletAddress: walletAddress || user.walletAddress,
          subscriptionTier
        }, setUser);
        toast.success("User profile updated");
      }
    } else {
      // Just update the subscription
      if (user.subscriptionTier !== subscriptionTier) {
        await updateUserData({
          ...user,
          subscriptionTier
        }, setUser);
      }
    }
  } catch (error) {
    console.error("Error refreshing user data:", error);
    toast.error("Failed to refresh user data. Please try again.");
  } finally {
    setIsLoading(false);
  }
};
