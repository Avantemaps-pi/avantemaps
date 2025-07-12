
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
export const canProceedWithPayment = async (): Promise<boolean> => {
  try {
    const piUser = window.Pi?.currentUser;
    if (!piUser?.uid) {
      return false;
    }

    // Check our database for any incomplete payments with explicit typing
    const { data: incompletePayments, error } = await supabase
      .from('payments')
      .select('payment_id, created_at, status')
      .eq('user_id', piUser.uid)
      .returns<Array<{
        payment_id: string;
        created_at: string;
        status: {
          completed?: boolean;
          cancelled?: boolean;
        };
      }>>();

    if (error) {
      console.error('Error checking for incomplete payments:', error);
      return true; // Allow payment to proceed if we can't check
    }

    if (!incompletePayments) {
      return true;
    }

    // Filter incomplete payments manually to avoid complex type inference
    const incompleteFiltered = incompletePayments.filter(payment => {
      const status = payment.status as any;
      return !status?.completed && !status?.cancelled;
    });

    // If we have recent incomplete payments (less than 15 minutes old), block new payments
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
    const recentIncomplete = incompleteFiltered.filter(payment => 
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
