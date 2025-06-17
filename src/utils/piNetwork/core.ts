/**
 * Core utilities for interacting with the Pi Network SDK
 */
import { isPiNetworkAvailable } from './helpers';
import { Scope } from './types';

// Flag to track SDK initialization
let isInitialized = false;
let initializationInProgress = false;
let initializationPromise: Promise<boolean> | null = null;
let initRetries = 0;
const MAX_RETRIES = 3;
const RETRY_DELAY = 2000; // 2 seconds

// Initialize the Pi Network SDK with improved performance and retry logic
export const initializePiNetwork = async (): Promise<boolean> => {
  // Return cached initialization promise if one is in progress
  if (initializationInProgress && initializationPromise) {
    console.log('Pi Network SDK initialization already in progress, returning existing promise');
    return initializationPromise;
  }
  
  // If SDK is already initialized, resolve immediately
  if (isInitialized) {
    console.log('Pi Network SDK is already initialized');
    return Promise.resolve(true);
  }
  
  // Reset retry counter on fresh initialization
  if (!initializationInProgress) {
    initRetries = 0;
  }
  
  // Set flag and create new initialization promise
  initializationInProgress = true;
  
  initializationPromise = new Promise((resolve, reject) => {
    // Set a timeout to prevent hanging - reduced to 5s for faster feedback
    const timeout = setTimeout(() => {
      initializationInProgress = false;
      
      // Retry logic instead of immediate rejection
      if (initRetries < MAX_RETRIES) {
        console.log(`Pi Network SDK initialization timed out, retrying... (${initRetries + 1}/${MAX_RETRIES})`);
        initRetries++;
        setTimeout(() => {
          initializationPromise = null; // Clear the promise to allow new attempts
          initializePiNetwork().then(resolve).catch(reject);
        }, RETRY_DELAY);
      } else {
        console.error('Pi Network SDK initialization failed after maximum retries');
        reject(new Error('Pi Network SDK initialization timed out after maximum retries'));
      }
    }, 5000); // 5 second timeout (reduced from 10s)
    
    // If SDK is available but not initialized, initialize it
    if (isPiNetworkAvailable()) {
      console.log('Pi Network SDK is loaded, initializing...');
      
      // Determine sandbox mode based on environment/hostname
      const isSandbox = determineSandboxMode();
      console.log(`Initializing Pi SDK with sandbox mode: ${isSandbox}`);
      
      window.Pi!.init({ version: "2.0", sandbox: isSandbox })
        .then(() => {
          console.log('Pi Network SDK initialized successfully');
          isInitialized = true;
          initializationInProgress = false;
          clearTimeout(timeout);
          resolve(true);
        })
        .catch(error => {
          console.error('Failed to initialize Pi Network SDK:', error);
          initializationInProgress = false;
          clearTimeout(timeout);
          
          // Retry logic for initialization failures
          if (initRetries < MAX_RETRIES) {
            console.log(`Retrying initialization... (${initRetries + 1}/${MAX_RETRIES})`);
            initRetries++;
            setTimeout(() => {
              initializationPromise = null; // Clear the promise to allow new attempts
              initializePiNetwork().then(resolve).catch(reject);
            }, RETRY_DELAY);
          } else {
            reject(error);
          }
        });
      return;
    }
    
    console.log('Loading Pi Network SDK from CDN...');
    
    // Create a script element to load the Pi SDK
    const script = document.createElement('script');
    script.src = 'https://sdk.minepi.com/pi-sdk.js';
    script.async = true;
    
    script.onload = () => {
      console.log('Pi Network SDK loaded successfully, initializing...');
      // Initialize the SDK after it's loaded
      if (window.Pi) {
        // Determine sandbox mode based on environment/hostname
        const isSandbox = determineSandboxMode();
        console.log(`Initializing Pi SDK with sandbox mode: ${isSandbox}`);
        
        window.Pi.init({ version: "2.0", sandbox: isSandbox })
          .then(() => {
            console.log('Pi Network SDK initialized successfully');
            isInitialized = true;
            initializationInProgress = false;
            clearTimeout(timeout);
            resolve(true);
          })
          .catch(error => {
            console.error('Failed to initialize Pi Network SDK:', error);
            initializationInProgress = false;
            clearTimeout(timeout);
            
            // Retry logic for initialization failures
            if (initRetries < MAX_RETRIES) {
              console.log(`Retrying initialization... (${initRetries + 1}/${MAX_RETRIES})`);
              initRetries++;
              setTimeout(() => {
                initializationPromise = null;
                initializePiNetwork().then(resolve).catch(reject);
              }, RETRY_DELAY);
            } else {
              reject(error);
            }
          });
      } else {
        const error = new Error('Pi Network SDK loaded but not defined');
        console.error(error);
        initializationInProgress = false;
        clearTimeout(timeout);
        reject(error);
      }
    };
    
    script.onerror = (error) => {
      console.error('Failed to load Pi Network SDK', error);
      initializationInProgress = false;
      clearTimeout(timeout);
      
      // Retry logic for script loading failures
      if (initRetries < MAX_RETRIES) {
        console.log(`Retrying SDK script loading... (${initRetries + 1}/${MAX_RETRIES})`);
        initRetries++;
        setTimeout(() => {
          initializationPromise = null;
          initializePiNetwork().then(resolve).catch(reject);
        }, RETRY_DELAY);
      } else {
        reject(new Error('Failed to load Pi Network SDK after maximum retries'));
      }
    };
    
    document.head.appendChild(script);
  });
  
  return initializationPromise;
};

/**
 * Determines whether to use sandbox mode based on environment/hostname
 * - dev branch should use sandbox: true
 * - testnet branch should use sandbox: false
 */
export const determineSandboxMode = (): boolean => {
  return true; // Force sandbox mode for all environments
};


// Check if SDK is initialized
export const isSdkInitialized = (): boolean => {
  return isInitialized;
};

/**
 * Request additional user permissions with improved error handling and timeout
 */
export const requestUserPermissions = async (): Promise<{
  username: string;
  uid: string;
  walletAddress?: string;
} | null> => {
  if (!isPiNetworkAvailable()) {
    console.error('Pi Network SDK not available');
    return null;
  }
  
  // Don't re-initialize if already done
  if (!isInitialized) {
    console.log('Pi Network SDK was not initialized. Initializing now...');
    try {
      await initializePiNetwork();
    } catch (error) {
      console.error('Failed to initialize Pi Network SDK:', error);
      return null;
    }
  }

  try {
    // Set a timeout for authentication - reduced to 6s for quicker feedback
    const authPromise = new Promise<any>((resolve, reject) => {
      const authTimeout = setTimeout(() => {
        reject(new Error('Permission request timed out'));
      }, 6000); // 6 second timeout - faster feedback to user
      
      // Use authenticate to request the required scopes as per SDK reference
      console.log('Requesting permissions with authenticate: username, payments, wallet_address');
      const scopes: Scope[] = ['username', 'payments', 'wallet_address'];
      
      window.Pi!.authenticate(scopes, (payment) => {
        console.log('Incomplete payment found during permission request:', payment);
        // Handle incomplete payment
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
    console.log('Permission request result:', authResult);
    
    if (!authResult) {
      console.error('Failed to get user permissions');
      return null;
    }

    // Type assertion to access wallet_address while ensuring TypeScript compatibility
    const authResultWithWallet = authResult as {
      user: {
        uid: string;
        username: string;
        roles?: string[];
        wallet_address?: string;
      };
      accessToken: string;
    };

    return {
      username: authResult.user.username,
      uid: authResult.user.uid,
      walletAddress: authResultWithWallet.user.wallet_address
    };
  } catch (error) {
    console.error('Error requesting user permissions:', error);
    return null;
  }
};

// Force re-initialization of the SDK
export const forceSdkReinitialization = async (): Promise<boolean> => {
  console.log('Forcing Pi SDK re-initialization');
  isInitialized = false;
  initializationInProgress = false;
  initializationPromise = null;
  initRetries = 0;
  
  return initializePiNetwork();
};
