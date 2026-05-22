/**
 * Simplified cleanup utilities for Pi Network payments
 * 
 * Based on Pi Network documentation, the SDK handles incomplete payments
 * automatically through the onIncompletePaymentFound callback
 */

import { toast } from 'sonner';
import { cleanupStalePayments } from '@/api/payments/cleanupStalePayments';
import { getPiAuthResult, clearPiAuth, initializePiNetwork, authenticateUser } from '../piNetwork/core';

/**
 * Clear any stored local payment data
 */
export const clearLocalPaymentData = (): void => {
  try {
    // Clear from both localStorage (legacy) and sessionStorage (new secure location)
    localStorage.removeItem('pi_incomplete_payment');
    localStorage.removeItem('pi_payment_in_progress');
    sessionStorage.removeItem('pi_incomplete_payment');
    sessionStorage.removeItem('pi_payment_in_progress');
    sessionStorage.removeItem('pi_current_payment');
    console.log('Cleared local payment data from all storage locations');
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
  const TOAST_ID = 'payment:cleanup';
  try {
    console.log('Starting payment cleanup process...');

    // Step 1: Clear local storage
    clearLocalPaymentData();

    toast.loading('Resolving pending payments…', { id: TOAST_ID });

    // Step 2: Get authenticated user
    let authResult = getPiAuthResult();
    if (!authResult) {
      toast.loading('Authenticating to resolve payment issues…', { id: TOAST_ID });
      try {
        authResult = await authenticateUser();
      } catch (error) {
        console.error('Authentication failed during cleanup:', error);
        toast.error('Unable to authenticate for payment cleanup', { id: TOAST_ID, duration: 4000 });
        return false;
      }
    }

    // Step 3: Call server-side cleanup
    const cleanupResult = await cleanupStalePayments(authResult.user.uid);
    console.log('Server cleanup result:', cleanupResult);

    if (cleanupResult.success) {
      if (cleanupResult.cleanedCount && cleanupResult.cleanedCount > 0) {
        toast.success(`Resolved ${cleanupResult.cleanedCount} pending payment(s)`, { id: TOAST_ID, duration: 4000 });
      } else {
        toast.success('No pending payments found to clean up', { id: TOAST_ID, duration: 4000 });
      }
      return true;
    } else {
      toast.error(`Cleanup failed: ${cleanupResult.message}`, { id: TOAST_ID, duration: 4000 });
      return false;
    }
  } catch (error) {
    console.error('Error in payment cleanup:', error);
    toast.error('Failed to resolve pending payments', { id: 'payment:cleanup', duration: 4000 });
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
    const authResult = getPiAuthResult();
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
