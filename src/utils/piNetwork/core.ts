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
  private authResult: AuthResult | null = null;
  private incompletePaymentHandler: ((payment: PaymentDTO) => void) | null = null;

  /**
   * Initialize the Pi SDK
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) return;

    return new Promise<void>((resolve, reject) => {
      // If SDK is already available, initialize it directly
      if (typeof window !== 'undefined' && window.Pi) {
        console.log('Pi SDK already loaded, initializing...');
        const isSandbox = this.determineSandboxMode();
        
        window.Pi.init({ version: "2.0", sandbox: isSandbox })
          .then(() => {
            console.log('Pi SDK initialized successfully');
            this.isInitialized = true;
            resolve();
          })
          .catch(reject);
        return;
      }

      // Load Pi SDK from CDN
      console.log('Loading Pi SDK...');
      const script = document.createElement('script');
      script.src = 'https://sdk.minepi.com/pi-sdk.js';
      script.async = true;
      
      script.onload = () => {
        if (window.Pi) {
          const isSandbox = this.determineSandboxMode();
          window.Pi.init({ version: "2.0", sandbox: isSandbox })
            .then(() => {
              console.log('Pi SDK initialized successfully');
              this.isInitialized = true;
              resolve();
            })
            .catch(reject);
        } else {
          reject(new Error('Pi SDK loaded but not available'));
        }
      };
      
      script.onerror = () => {
        reject(new Error('Failed to load Pi SDK'));
      };
      
      document.head.appendChild(script);
    });
  }

  /**
   * Determines sandbox mode based on environment
   */
  private determineSandboxMode(): boolean {
    const hostname = window.location.hostname;
    return hostname === 'localhost' || 
           hostname.includes('127.0.0.1') ||
           hostname.includes('dev') ||
           hostname.includes('sandbox');
  }

  /**
   * Authenticate user with Pi Network
   */
  public async authenticate(): Promise<AuthResult> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    if (!window.Pi) {
      throw new Error('Pi SDK not available');
    }

    try {
      // Request all necessary scopes as per documentation
      const scopes = ['payments', 'username', 'wallet_address'];
      
      // Set up incomplete payment handler
      const onIncompletePaymentFound = (payment: PaymentDTO) => {
        console.log('Incomplete payment found:', payment);
        if (this.incompletePaymentHandler) {
          this.incompletePaymentHandler(payment);
        } else {
          console.warn('No incomplete payment handler set. Payment:', payment.identifier);
          // Store incomplete payment for later handling (use sessionStorage for security)
          try {
            sessionStorage.setItem('pi_incomplete_payment', JSON.stringify(payment));
          } catch (e) {
            console.error('Failed to store incomplete payment:', e);
          }
        }
      };

      // Authenticate with Pi Network
      this.authResult = await window.Pi.authenticate(scopes, onIncompletePaymentFound);
      
      console.log('Pi authentication successful:', this.authResult.user.username);
      return this.authResult;
    } catch (error) {
      console.error('Pi authentication failed:', error);
      throw new Error(`Pi authentication failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
    await piNetworkCore.initialize();
    return true;
  } catch (error) {
    console.error('Failed to initialize Pi:', error);
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

export const isSdkInitialized = () => piNetworkCore.isAuthenticated();
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
