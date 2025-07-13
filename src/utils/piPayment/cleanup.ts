
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { cleanupStalePayments } from '@/api/payments/cleanupStalePayments';

/**
 * Enhanced cleanup utilities for Pi Network payments
 * Specifically designed to handle "pending payment" errors
 */

// Clear any stored incomplete payment data
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

// Comprehensive cleanup for pending payment issues
export const forceResolvePendingPayments = async (): Promise<boolean> => {
  try {
    console.log('Starting comprehensive pending payment cleanup...');
    toast.info('Cleaning up payment issues...');

    // Step 1: Clear all local storage
    clearLocalPaymentData();

    // Step 2: Get current user
    const piUser = window.Pi?.currentUser;
    if (!piUser?.uid) {
      toast.error('Unable to identify user for cleanup');
      return false;
    }

    // Step 3: Force close any Pi SDK payment modals/flows
    if (window.Pi?.closeApp) {
      try {
        window.Pi.closeApp();
        console.log('Attempted to close Pi app/modal');
      } catch (e) {
        console.log('Could not close Pi app:', e);
      }
    }

    // Step 4: Call our enhanced cleanup function
    const cleanupResult = await cleanupStalePayments(piUser.uid);
    console.log('Cleanup result:', cleanupResult);

    if (cleanupResult.success) {
      if (cleanupResult.cleanedCount && cleanupResult.cleanedCount > 0) {
        toast.success(`Resolved ${cleanupResult.cleanedCount} pending payment(s)`);
      } else {
        toast.success('No pending payments found to clean up');
      }
      
      // Step 5: Wait longer for Pi Network to update
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // Step 6: Try to reset Pi SDK state
      if (window.Pi?.init) {
        try {
          console.log('Attempting to reinitialize Pi SDK...');
          // Don't await this as it might hang
          window.Pi.init({ version: "2.0", sandbox: false });
        } catch (e) {
          console.log('Pi SDK reinit failed:', e);
        }
      }
      
      return true;
    } else {
      toast.error(`Cleanup failed: ${cleanupResult.message}`);
      return false;
    }
  } catch (error) {
    console.error('Error in comprehensive cleanup:', error);
    toast.error('Failed to resolve pending payments');
    return false;
  }
};

// Check if we can proceed with a new payment
// Note: This function now always returns true as we handle pending payment errors 
// when they actually occur during payment attempts
export const canProceedWithPayment = async (): Promise<boolean> => {
  try {
    const piUser = window.Pi?.currentUser;
    if (!piUser?.uid) {
      return false;
    }

    // Always return true - we'll handle pending payment errors when they occur
    return true;
  } catch (error) {
    console.error('Error checking payment eligibility:', error);
    return true; // Allow payment to proceed if check fails
  }
};
