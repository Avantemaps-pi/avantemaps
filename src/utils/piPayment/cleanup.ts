/**
 * Simplified cleanup utilities for Pi Network payments
 * 
 * Based on Pi Network documentation, the SDK handles incomplete payments
 * automatically through the onIncompletePaymentFound callback
 */

import { toast } from 'sonner';
import { cleanupStalePayments } from '@/api/payments/cleanupStalePayments';
import { getPiAuthResult, clearPiAuth, initializePi, authenticateUser } from '../piNetwork/core';

/**
 * Clear any stored local payment data
 */
export const clearLocalPaymentData = (): void => {
  try {
    localStorage.removeItem('pi_incomplete_payment');
    localStorage.removeItem('pi_payment_in_progress');
    sessionStorage.removeItem('pi_current_payment');
    console.log('Cleared local payment data');
  } catch (error) {
    console.error('Error clearing local payment data:', error);
  }
};

/**
 * Force resolve pending payments
 * This function is simplified as per Pi Network documentation -
 * incomplete payments should be handled automatically by the SDK
 */
export const forceResolvePendingPayments = async (): Promise<boolean> => {
  try {
    console.log('Starting payment cleanup process...');
    
    // Step 1: Clear local storage
    clearLocalPaymentData();

    // Step 2: Get authenticated user
    let authResult = getPiAuthResult();
    if (!authResult) {
      toast.info('Authenticating to resolve payment issues...');
      try {
        authResult = await authenticateUser();
      } catch (error) {
        console.error('Authentication failed during cleanup:', error);
        toast.error('Unable to authenticate for payment cleanup');
        return false;
      }
    }

    // Step 3: Call server-side cleanup
    const cleanupResult = await cleanupStalePayments(authResult.user.uid);
    console.log('Server cleanup result:', cleanupResult);

    if (cleanupResult.success) {
      if (cleanupResult.cleanedCount && cleanupResult.cleanedCount > 0) {
        toast.success(`Resolved ${cleanupResult.cleanedCount} pending payment(s)`);
      } else {
        toast.success('No pending payments found to clean up');
      }
      return true;
    } else {
      toast.error(`Cleanup failed: ${cleanupResult.message}`);
      return false;
    }
  } catch (error) {
    console.error('Error in payment cleanup:', error);
    toast.error('Failed to resolve pending payments');
    return false;
  }
};

/**
 * Check if we can proceed with a new payment
 * 
 * According to Pi Network documentation, the SDK will automatically
 * handle incomplete payments via the onIncompletePaymentFound callback,
 * so we can always proceed with new payments
 */
export const canProceedWithPayment = async (): Promise<boolean> => {
  try {
    // Ensure we have authentication
    let authResult = getPiAuthResult();
    if (!authResult) {
      return false; // Need authentication first
    }

    // According to Pi documentation, the SDK handles incomplete payments
    // automatically, so we can always proceed
    return true;
  } catch (error) {
    console.error('Error checking payment eligibility:', error);
    return true; // Default to allowing payment if check fails
  }
};