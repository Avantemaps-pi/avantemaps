/**
 * Pi Network Payment Implementation
 * 
 * Based on the official Pi Platform documentation (payments.md)
 * 
 * This implementation follows the three-phase payment flow:
 * Phase I: Payment creation and Server-Side Approval
 * Phase II: User interaction and blockchain transaction
 * Phase III: Server-Side Completion
 */

import { toast } from 'sonner';
import { 
  authenticateUser, 
  createPiPayment, 
  setIncompletePaymentHandler,
  initializePi,
  getPiAuthResult
} from '../piNetwork/core';
import { PaymentResult, SubscriptionFrequency } from './types';
import { SubscriptionTier } from '../piNetwork/types';
import type { PaymentData, PaymentCallbacks, PaymentDTO } from '../piNetwork/core';
import { approvePayment, completePayment } from '@/api/payments';

let paymentInProgress = false;

/**
 * Execute subscription payment using Pi Network
 * Follows the official documentation flow
 */
export const executeSubscriptionPayment = async (
  amount: number,
  tier: SubscriptionTier,
  frequency: SubscriptionFrequency
): Promise<PaymentResult> => {
  try {
    // Guard against multiple concurrent payments
    if (paymentInProgress) {
      console.warn("Payment already in progress");
      return {
        success: false,
        message: "A payment is already being processed. Please wait."
      };
    }

    // Ensure Pi SDK is initialized
    const initSuccess = await initializePi();
    if (!initSuccess) {
      throw new Error("Failed to initialize Pi Network SDK");
    }

    // Set up incomplete payment handler before authentication
    setIncompletePaymentHandler((payment: PaymentDTO) => {
      console.log('Incomplete payment detected:', payment);
      toast.error(`You have an incomplete payment (${payment.identifier}). It will be handled automatically.`);
      
      // Handle the incomplete payment by attempting completion
      handleIncompletePayment(payment);
    });

    // Authenticate user if not already authenticated
    let authResult = getPiAuthResult();
    if (!authResult) {
      console.log('User not authenticated, authenticating...');
      authResult = await authenticateUser();
    }

    paymentInProgress = true;

    // Create payment data according to Pi Network documentation
    const paymentData: PaymentData = {
      amount,
      memo: `Avante Maps ${tier} subscription (${frequency})`,
      metadata: {
        subscriptionTier: tier,
        frequency,
        timestamp: new Date().toISOString(),
        userId: authResult.user.uid
      }
    };

    console.log("Creating Pi Network payment:", paymentData);

    // Phase I, II, III: Payment creation with proper callbacks
    return new Promise((resolve, reject) => {
      const callbacks: PaymentCallbacks = {
        // Phase I: Server-Side Approval
        onReadyForServerApproval: async (paymentId: string) => {
          console.log("Phase I - Payment ready for server approval:", paymentId);
          
          try {
            console.log("Sending payment for server-side approval...");
            
            const approvalResult = await approvePayment({
              paymentId,
              userId: authResult!.user.uid,
              amount: paymentData.amount,
              memo: paymentData.memo,
              metadata: paymentData.metadata
            });

            if (!approvalResult.success) {
              console.error("Server-side approval failed:", approvalResult.message);
              paymentInProgress = false;
              reject(new Error(`Payment approval failed: ${approvalResult.message}`));
              return;
            }

            console.log("Phase I completed - Payment approved:", paymentId);
            // Phase II (user interaction) is handled by Pi Network platform
            
          } catch (error) {
            console.error("Error during server-side approval:", error);
            paymentInProgress = false;
            reject(new Error(`Payment approval error: ${error instanceof Error ? error.message : 'Unknown error'}`));
          }
        },

        // Phase III: Server-Side Completion
        onReadyForServerCompletion: async (paymentId: string, txid: string) => {
          console.log("Phase III - Payment ready for server completion:", paymentId, "TxID:", txid);
          
          try {
            console.log("Sending payment for server-side completion...");
            
            const completionResult = await completePayment({
              paymentId,
              txid,
              userId: authResult!.user.uid,
              amount: paymentData.amount,
              memo: paymentData.memo,
              metadata: paymentData.metadata
            });

            if (!completionResult.success) {
              console.error("Server-side completion failed:", completionResult.message);
              paymentInProgress = false;
              reject(new Error(`Payment completion failed: ${completionResult.message}`));
              return;
            }

            console.log("Phase III completed - Payment successful:", paymentId, "TxID:", txid);
            
            paymentInProgress = false;
            resolve({
              success: true,
              transactionId: txid,
              message: "Payment successful! Your subscription has been upgraded.",
              shouldRefreshUser: true // Signal that user data should be refreshed
            });
            
          } catch (error) {
            console.error("Error during server-side completion:", error);
            paymentInProgress = false;
            reject(new Error(`Payment completion error: ${error instanceof Error ? error.message : 'Unknown error'}`));
          }
        },

        // Payment cancelled by user
        onCancel: (paymentId: string) => {
          console.log("Payment cancelled by user:", paymentId);
          paymentInProgress = false;
          resolve({ 
            success: false, 
            message: "Payment was cancelled." 
          });
        },

        // Payment error occurred
        onError: (error: Error, payment?: PaymentDTO) => {
          console.error("Payment error:", error, payment);
          paymentInProgress = false;
          
          // Handle specific Pi Network errors according to documentation
          if (error.message.includes('pending payment') || 
              error.message.includes('action from the developer') ||
              error.message.includes('already have a pending payment')) {
            
            reject(new Error("You have a pending payment that needs to be resolved. This will be handled automatically."));
          } else {
            reject(error);
          }
        }
      };

      // Create payment using Pi Network SDK
      createPiPayment(paymentData, callbacks);
    });
    
  } catch (error) {
    console.error("Pi payment error:", error);
    paymentInProgress = false;
    return {
      success: false,
      message: error instanceof Error ? error.message : "Payment failed"
    };
  }
};

/**
 * Handle incomplete payment found during authentication
 */
const handleIncompletePayment = async (payment: PaymentDTO): Promise<void> => {
  try {
    console.log('Handling incomplete payment:', payment);
    
    // Check if payment needs server-side completion
    if (payment.transaction?.txid && !payment.status.developer_completed) {
      console.log('Attempting to complete incomplete payment with txid:', payment.transaction.txid);
      
      const completionResult = await completePayment({
        paymentId: payment.identifier,
        txid: payment.transaction.txid,
        userId: payment.user_uid,
        amount: payment.amount,
        memo: payment.memo,
        metadata: payment.metadata
      });

      if (completionResult.success) {
        console.log('Successfully completed incomplete payment:', payment.identifier);
        toast.success('Your previous payment has been processed successfully!');
      } else {
        console.error('Failed to complete incomplete payment:', completionResult.message);
        toast.error('Failed to process your previous payment. Please contact support.');
      }
    } else {
      console.log('Incomplete payment does not need completion:', payment);
    }
  } catch (error) {
    console.error('Error handling incomplete payment:', error);
    toast.error('Error processing incomplete payment. Please contact support.');
  }
};

/**
 * Check if a payment is currently in progress
 */
export const isPaymentInProgress = (): boolean => {
  return paymentInProgress;
};

/**
 * Force reset payment state (use with caution)
 */
export const resetPaymentState = (): void => {
  paymentInProgress = false;
  console.log("Payment state has been reset");
};