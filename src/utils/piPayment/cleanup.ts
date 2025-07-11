
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

    // Step 3: Call our enhanced cleanup function
    const cleanupResult = await cleanupStalePayments(piUser.uid);
    console.log('Cleanup result:', cleanupResult);

    if (cleanupResult.success) {
      if (cleanupResult.cleanedCount && cleanupResult.cleanedCount > 0) {
        toast.success(`Resolved ${cleanupResult.cleanedCount} pending payment(s)`);
      } else {
        toast.success('No pending payments found to clean up');
      }
      
      // Step 4: Wait a moment for cleanup to propagate
      await new Promise(resolve => setTimeout(resolve, 2000));
      
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
export const canProceedWithPayment = async (): Promise<boolean> => {
  try {
    const piUser = window.Pi?.currentUser;
    if (!piUser?.uid) {
      return false;
    }

    // Check our database for any incomplete payments
    const { data: incompletePayments, error } = await supabase
      .from('payments')
      .select('payment_id, created_at, status')
      .eq('user_id', piUser.uid)
      .eq('status->completed', false)
      .eq('status->cancelled', false);

    if (error) {
      console.error('Error checking for incomplete payments:', error);
      return true; // Allow payment to proceed if we can't check
    }

    // If we have recent incomplete payments (less than 15 minutes old), block new payments
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
    const recentIncomplete = incompletePayments?.filter(payment => 
      new Date(payment.created_at) > fifteenMinutesAgo
    );

    if (recentIncomplete && recentIncomplete.length > 0) {
      console.log('Found recent incomplete payments:', recentIncomplete);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error checking payment eligibility:', error);
    return true; // Allow payment to proceed if check fails
  }
};
