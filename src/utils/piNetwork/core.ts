/**
 * Pi Network Core Integration
 * 
 * This module handles Pi Network authentication and initialization
 * according to the official Pi Network SDK documentation.
 */

import { SubscriptionTier } from './types';

export interface AuthResult {
  accessToken: string;
  user: {
    uid: string;
    username: string;
    wallet_address?: string;
  };
}

export interface PaymentData {
  amount: number;
  memo: string;
  metadata: {
    subscriptionTier: SubscriptionTier;
    frequency: string;
    [key: string]: any;
  };
}

export interface PaymentCallbacks {
  onReadyForServerApproval: (paymentId: string) => void;
  onReadyForServerCompletion: (paymentId: string, txid: string) => void;
  onCancel: (paymentId: string) => void;
  onError: (error: Error, payment?: PaymentDTO) => void;
}

export interface PaymentDTO {
  identifier: string;
  user_uid: string;
  amount: number;
  memo: string;
  metadata: any;
  from_address: string;
  to_address: string;
  direction: 'user_to_app' | 'app_to_user';
  created_at: string;
  network: 'Pi Network' | 'Pi Testnet';
  status: {
    developer_approved: boolean;
    transaction_verified: boolean;
    developer_completed: boolean;
    cancelled: boolean;
    user_cancelled: boolean;
  };
  transaction: null | {
    txid: string;
    verified: boolean;
    _link: string;
  };
}

class PiNetworkCore {
  private isInitialized = false;
  private sdkReady: Promise<void> | null = null; // 🆕 Ensures all SDK init calls share one promise
  private authResult: AuthResult | null = null;
  private incompletePaymentHandler: ((payment: PaymentDTO) => void) | null = null;

  /**
   * Initialize the Pi SDK with retry logic and improved error handling
   */
    public async initialize(): Promise<void> {
    if (this.isInitialized) return;
  
    // 🆕 Ensure all parallel initialization attempts use the same promise
    if (!this.sdkReady) {
      this.sdkReady = this.initializeAttempt().catch((error) => {
        console.error("❌ Pi SDK initialization failed:", error);
        this.sdkReady = null;
        throw error;
      });
    }
  
    return this.sdkReady;
  }


private async initializeAttempt(): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('Window object not available (not in browser environment)'));
      return;
    }

    // ✅ If SDK already available, just init
    if (window.Pi && typeof window.Pi.authenticate === "function") {
      console.log("✅ Pi SDK detected, forcing initialization...");

      const isSandbox = this.determineSandboxMode();

      window.Pi.init({ version: "2.0", sandbox: isSandbox })
        .then(() => {
          console.log("✅ Pi SDK initialized successfully (forced).");
          this.isInitialized = true;
          (window as any).__piInitialized = true;
          resolve();
        })
        .catch((err: any) => {
          console.error("❌ Pi SDK init() failed during forced re-init:", err);
          reject(new Error(`Pi SDK init failed: ${err instanceof Error ? err.message : 'Unknown error'}`));
        });

      return;
    }

    console.log('⚙️ Pi SDK not detected, dynamically loading...');

    // 🧠 Step 1: dynamically inject SDK script
    const script = document.createElement('script');
    script.src = 'https://sdk.minepi.com/pi-sdk.js';
    script.async = true;

    const timeout = setTimeout(() => {
      reject(new Error('⏰ Timeout loading Pi SDK script'));
    }, 15000);

    script.onload = () => {
      clearTimeout(timeout);

      // 🧠 Step 2: verify SDK is available
      const Pi = (window as any).Pi;
      if (!Pi) {
        reject(new Error('Pi SDK loaded but window.Pi is undefined'));
        return;
      }

      console.log('✅ Pi SDK loaded successfully, initializing...');
      const isSandbox = this.determineSandboxMode();

      // 🧠 Step 3: initialize the SDK
      Pi.init({ version: "2.0", sandbox: isSandbox })
        .then(() => {
          console.log('✅ Pi SDK initialized successfully');
          this.isInitialized = true;
          (window as any).__piInitialized = true;
          resolve();
        })
        .catch((err: any) => {
          reject(new Error(`❌ Pi SDK init failed: ${err instanceof Error ? err.message : 'Unknown error'}`));
        });
    };

    script.onerror = (error) => {
      clearTimeout(timeout);
      reject(new Error(`❌ Failed to load Pi SDK script: ${error}`));
    };

    // 🧠 Step 4: ensure only one script tag
    const existingScript = document.querySelector('script[src*="pi-sdk.js"]');
    if (!existingScript) {
      document.head.appendChild(script);
    } else {
      console.log('⚠️ SDK script already exists, waiting for load...');
    }
  });
}

  /**
   * Determines sandbox mode based on environment
   */
 private determineSandboxMode(): boolean {
  const hostname = window.location.hostname;
  return (
    hostname === "localhost" ||
    hostname.includes("127.0.0.1") ||
    hostname.includes("dev") ||
    hostname.includes("sandbox") ||
    hostname.endsWith("minepi.com")
  );
}

  /**
   * Authenticate user with Pi Network
   */
  public async authenticate(): Promise<AuthResult> {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }
  
      if (!window.Pi) {
        throw new Error('Pi SDK not available');
      }
  
      const scopes = ['payments', 'username', 'wallet_address'];
  
      const onIncompletePaymentFound = (payment: PaymentDTO) => {
        console.log('⚠️ Incomplete payment found:', payment);
        if (this.incompletePaymentHandler) {
          this.incompletePaymentHandler(payment);
        } else {
          try {
            sessionStorage.setItem('pi_incomplete_payment', JSON.stringify(payment));
          } catch (e) {
            console.error('Failed to store incomplete payment:', e);
          }
        }
      };

      // Wait briefly to ensure Pi Messaging channel is ready
      await new Promise(res => setTimeout(res, 500));
      this.authResult = await window.Pi.authenticate(scopes, onIncompletePaymentFound);    
      console.log('✅ Pi authentication successful:', this.authResult.user.username);
      
      // 🆕 Verify token with backend
      try {
        const verifyResponse = await fetch(`https://xvpwbocwasbtzrzrxyvu.supabase.co/functions/v1/verify-pi-auth`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${this.authResult.accessToken}`
          },
          body: JSON.stringify({
            accessToken: this.authResult.accessToken,
            uid: this.authResult.user.uid,
            username: this.authResult.user.username
          })
        });

        const responseData = await verifyResponse.json();
        console.log("🧩 Server verification response:", responseData);

        // ✅ Establish Supabase session if the edge function returned a token
        if (responseData?.supabase_token) {
          try {
            const { supabase } = await import('@/integrations/supabase/client');
            await supabase.auth.setSession({
              access_token: responseData.supabase_token,
              refresh_token: responseData.supabase_token, // optional if you don't issue refresh tokens
            });
            console.log("✅ Supabase session established for Pi user");
          } catch (sessionErr) {
            console.error("❌ Failed to set Supabase session:", sessionErr);
          }
        }
        
        if (!verifyResponse.ok) {
          console.warn("⚠️ Supabase verification endpoint returned:", verifyResponse.status, verifyResponse.statusText);
        }

        if (!verifyResponse.ok || !responseData?.verified) {
          const errorMsg = responseData?.error || responseData?.details || "Token verification failed on backend";
          console.error("❌ Verification failed:", errorMsg);
          throw new Error(errorMsg);
        }

        console.log("✅ Token successfully verified with backend");
      } catch (verifyErr) {
        console.error("❌ Backend token verification failed:", verifyErr);
        throw new Error(`Authentication failed: ${verifyErr instanceof Error ? verifyErr.message : 'Unknown error'}`);
      }
      
      return this.authResult;
      
    } catch (error) {
      console.error('❌ Pi authentication failed:', error);
      // 🆕 Prevent app crash and provide structured rejection
      return Promise.reject({
        error: error instanceof Error ? error.message : String(error),
        success: false,
      });
    }
  }

  /**
   * Set handler for incomplete payments
   */
  public setIncompletePaymentHandler(handler: (payment: PaymentDTO) => void): void {
    this.incompletePaymentHandler = handler;
  }

  /**
   * Create a payment using Pi Network
   */
  public async createPayment(
    paymentData: PaymentData,
    callbacks: PaymentCallbacks
  ): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    if (!this.authResult) {
      throw new Error('User not authenticated. Call authenticate() first.');
    }

    if (!window.Pi) {
      throw new Error('Pi SDK not available');
    }

    try {
      console.log('Creating Pi payment:', paymentData);
      
      // Create payment using Pi SDK
      window.Pi.createPayment(paymentData, callbacks);
    } catch (error) {
      console.error('Failed to create Pi payment:', error);
      throw error;
    }
  }

  /**
   * Get current authentication result
   */
  public getAuthResult(): AuthResult | null {
    return this.authResult;
  }

  /**
   * Check if user is authenticated
   */
  public isAuthenticated(): boolean {
    return this.authResult !== null;
  }

  /**
   * Check if SDK is properly initialized
   */
  public isSdkInitialized(): boolean {
    return this.isInitialized && typeof window !== 'undefined' && !!window.Pi;
  }

  /**
   * Clear authentication state
   */
  public clearAuth(): void {
    this.authResult = null;
  }
}

// Export singleton instance
export const piNetworkCore = new PiNetworkCore();

// Export utility functions
export const initializePi = async (): Promise<boolean> => {
  try {
    if (typeof window === 'undefined') {
      console.warn("❌ Pi SDK initialization skipped — not running in a browser environment.");
      return false;
    }
  
    if (!window.Pi) {
      console.warn("⚠️ Pi SDK not detected — attempting to load or mock (if DEV).");
  
      // 🆕 Fail-safe: add console error if in production and still missing
      if (!import.meta.env.DEV) {
        console.error("❌ Pi SDK not found. Make sure you’re running inside Pi Browser or SDK is loaded.");
      }
  
      // Provide mock SDK in DEV mode
      if (import.meta.env.DEV) {
        window.Pi = {
          init: async () => console.log("Mock Pi.init() called (DEV mode)"),
          authenticate: async () => ({
            user: { uid: "dev123", username: "pi_mock_user" },
            accessToken: "mock_token"
          }),
          createPayment: () => console.log("Mock createPayment() called")
        };
        return true;
      }
    }

    // Initialize via your core wrapper (safe)
    await piNetworkCore.initialize();
    return true;
  } catch (error) {
    console.error('❌ Failed to initialize Pi:', error);
    return false;
  }
};

export const authenticateUser = () => piNetworkCore.authenticate();
export const createPiPayment = (data: PaymentData, callbacks: PaymentCallbacks) => 
  piNetworkCore.createPayment(data, callbacks);
export const isUserAuthenticated = () => piNetworkCore.isAuthenticated();
export const setIncompletePaymentHandler = (handler: (payment: PaymentDTO) => void) =>
  piNetworkCore.setIncompletePaymentHandler(handler);
export const clearPiAuth = () => piNetworkCore.clearAuth();
export const getPiAuthResult = () => piNetworkCore.getAuthResult();

// Export sandbox mode utility
export const determineSandboxMode = (): boolean => {
  const hostname = window.location.hostname;
  return hostname === 'localhost' || 
         hostname.includes('127.0.0.1') ||
         hostname.includes('dev') ||
         hostname.includes('sandbox');
};

// Legacy compatibility exports
export const initializePiNetwork = initializePi;
export const requestUserPermissions = async (): Promise<{
  username: string;
  uid: string;
  walletAddress?: string;
} | null> => {
  try {
    const authResult = await authenticateUser();
    return {
      username: authResult.user.username,
      uid: authResult.user.uid,
      walletAddress: authResult.user.wallet_address
    };
  } catch (error) {
    console.error('Error requesting user permissions:', error);
    return null;
  }
};

export const isSdkInitialized = () => piNetworkCore.isSdkInitialized();
export const forceSdkReinitialization = async (): Promise<boolean> => {
  try {
    piNetworkCore.clearAuth();
    await piNetworkCore.initialize();
    return true;
  } catch (error) {
    console.error('Failed to reinitialize Pi SDK:', error);
    return false;
  }
};
