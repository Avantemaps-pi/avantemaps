
import { toast } from 'sonner';
import { PiUser } from './types';
import { 
  isPiNetworkAvailable, 
  initializePiNetwork,
  requestUserPermissions,
  forceSdkReinitialization
} from '@/utils/piNetwork';
import { SubscriptionTier } from '@/utils/piNetwork/types';
import { getUserSubscription, updateUserData } from './authUtils';

// Request permissions before authenticating with improved error handling
export const requestAuthPermissions = async (
  isSdkInitialized: boolean,
  setIsLoading: (loading: boolean) => void,
  setAuthError: (error: string | null) => void
): Promise<boolean> => {
  let retryCount = 0;
  const maxRetries = 2; // Maximum number of retries for permission requests
  
  while (retryCount <= maxRetries) {
    if (retryCount > 0) {
      console.log(`Retrying permission request (attempt ${retryCount}/${maxRetries})...`);
      // Wait briefly before retrying
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Try to re-initialize SDK if needed
      if (!isSdkInitialized || retryCount > 1) {
        try {
          console.log("Re-initializing Pi SDK before retry");
          await forceSdkReinitialization();
        } catch (error) {
          console.error("Failed to re-initialize SDK:", error);
        }
      }
    }

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
        if (retryCount < maxRetries) {
          retryCount++;
          continue;
        }
        console.error("Pi Network SDK is not available");
        throw new Error("Pi Network SDK is not available");
      }

      // Set explicit permission request timeout - reduced to 6 seconds
      const requestTimeout = setTimeout(() => {
        if (retryCount < maxRetries) {
          retryCount++;
          setIsLoading(false);
          console.log("Permission request timeout, retrying...");
        } else {
          setIsLoading(false);
          setAuthError("Permission request timed out. Please try again.");
          toast.error("Permission request timed out. Please try again.");
        }
      }, 6000); // 6 second timeout

      // Request permissions with Pi Network
      const userInfo = await requestUserPermissions();
      clearTimeout(requestTimeout);
      
      if (userInfo) {
        console.log("Permission request successful:", userInfo);
        return true;
      } else {
        console.log("Permission request failed or was denied");
        if (retryCount < maxRetries) {
          retryCount++;
          continue;
        }
        throw new Error("Permission request failed or was denied");
      }
    } catch (error) {
      let errorMessage = "Permission request failed";
      
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      if (retryCount < maxRetries) {
        console.log(`Permission error (attempt ${retryCount}): ${errorMessage}, retrying...`);
        retryCount++;
        continue;
      }
      
      console.error("Permission error:", errorMessage);
      setAuthError(errorMessage);
      toast.error(errorMessage);
      return false;
    } finally {
      setIsLoading(false);
    }
  }
  
  return false;
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
      console.log("Authenticating with Pi Network, requesting scopes: username, payments, wallet_address");
      
      // Create a promise with timeout for authentication - reduced to 6 seconds
      const authPromise = new Promise<any>((resolve, reject) => {
        const authTimeout = setTimeout(() => {
          reject(new Error('Authentication request timed out'));
        }, 6000); // 6 second timeout for this specific step
        
        window.Pi!.authenticate(['username', 'payments', 'wallet_address'], (payment) => {
          console.log('Incomplete payment found:', payment);
          // Store it to be handled after authentication
          if (window.localStorage) {
            window.localStorage.setItem('pi_incomplete_payment', JSON.stringify(payment));
          }
        })
        .then(result => {
          clearTimeout(authTimeout);
          resolve(result);
        })
        .catch(err => {
          clearTimeout(authTimeout);
          reject(err);
        });
      });
      
      const authResult = await authPromise;
      
      console.log("Authentication result:", authResult);
      
      if (authResult && authResult.user && authResult.accessToken) {
        console.log("Authentication successful");
        
        // Store the current user in the window.Pi object for later use
        if (window.Pi) {
          window.Pi.currentUser = {
            uid: authResult.user.uid,
            username: authResult.user.username,
            roles: authResult.user.roles
          };
        }
        
        // Get user's subscription tier from Supabase
        const subscriptionTier = await getUserSubscription(authResult.user.uid);
        
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
        
        const userData: PiUser = {
          uid: authResult.user.uid,
          username: authResult.user.username,
          walletAddress: walletAddress, 
          roles: authResult.user.roles,
          accessToken: authResult.accessToken,
          lastAuthenticated: Date.now(),
          subscriptionTier
        };

        // Update Supabase and localStorage
        await updateUserData(userData, setUser);
        
        toast.success(`Welcome back, ${userData.username}!`);
        return; // Success! Exit the retry loop
      } else {
        console.error("Authentication failed: auth result incomplete", authResult);
        if (authAttempt < maxAuthAttempts) {
          authAttempt++;
          continue;
        }
        throw new Error("Authentication failed");
      }
    } catch (error) {
      let errorMessage = "Authentication failed";
      
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      if (authAttempt < maxAuthAttempts) {
        console.log(`Authentication error (attempt ${authAttempt}): ${errorMessage}, retrying...`);
        authAttempt++;
        continue;
      }
      
      setAuthError(errorMessage);
      toast.error(errorMessage);
      console.error("Auth error:", error);
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
      console.log("Refreshing user permissions with authenticate");
      const authResult = await window.Pi!.authenticate(['username', 'payments', 'wallet_address'], (payment) => {
        console.log('Incomplete payment found during refresh:', payment);
        // Store it to be handled later
        if (window.localStorage) {
          window.localStorage.setItem('pi_incomplete_payment', JSON.stringify(payment));
        }
      });
      
      if (authResult) {
        // Update the current user in the window.Pi object
        if (window.Pi) {
          window.Pi.currentUser = {
            uid: authResult.user.uid,
            username: authResult.user.username,
            roles: authResult.user.roles
          };
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
