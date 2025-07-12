import { toast } from 'sonner';
import { initializePiNetwork, isPiNetworkAvailable } from '../piNetwork';
import { PaymentResult, SubscriptionFrequency } from './types';
import { SubscriptionTier, PaymentDTO, PaymentData, PaymentCallbacks } from '../piNetwork/types';
import { approvePayment, completePayment } from '@/api/payments';

let paymentInProgress = false;

/**
 * Pi Network Payment Implementation
 * 
 * Based on the official Pi Platform documentation (payments.md)
 * 
 * Flow:
 * 1. createPayment - Frontend creates payment, Payment Flow UI opens
 * 2. onReadyForServerApproval - SDK passes PaymentID to app for server-side approval  
 * 3. Frontend sends PaymentID to server
 * 4. Server calls /approve API to approve payment with Pi Servers
 * 5. User interaction with payment dialog (handled by Pi Platform)
 * 6. onReadyForServerCompletion - SDK passes TxID to app for server-side completion
 * 7. Frontend sends TxID to server
 * 8. Server calls /complete API to acknowledge payment with Pi Servers
 * 9. Payment flow closes, app becomes visible again
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

    // Ensure Pi Network SDK is available and initialized
    if (!isPiNetworkAvailable()) {
      throw new Error("Pi Network SDK is not available");
    }

    await initializePiNetwork();

    // Verify user is authenticated
    const piUser = window.Pi?.currentUser;
    if (!piUser?.uid) {
      throw new Error("User not authenticated");
    }

    paymentInProgress = true;

    // Phase I: Payment creation and Server-Side Approval
    return new Promise((resolve, reject) => {
      try {
        const paymentData: PaymentData = {
          amount,
          memo: `Avante Maps ${tier} subscription (${frequency})`,
          metadata: {
            subscriptionTier: tier,
            frequency,
            timestamp: new Date().toISOString(),
            userId: piUser.uid
          }
        };

        console.log("Creating Pi Network payment with data:", paymentData);

        const callbacks: PaymentCallbacks = {
          // Phase I: Server-Side Approval Callback
          onReadyForServerApproval: async (paymentId: string) => {
            console.log("Payment ready for server approval:", paymentId);
            
            try {
              // Step 3: Frontend sends PaymentID to server
              console.log("Sending payment for server-side approval...");
              
              const approvalResult = await approvePayment({
                paymentId,
                userId: piUser.uid,
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

              console.log("Payment approved successfully:", paymentId);
              // Now Pi Platform enables user interaction with payment dialog (Phase II)
              
            } catch (error) {
              console.error("Error during server-side approval:", error);
              paymentInProgress = false;
              reject(new Error(`Payment approval error: ${error instanceof Error ? error.message : 'Unknown error'}`));
            }
          },

          // Phase III: Server-Side Completion Callback  
          onReadyForServerCompletion: async (paymentId: string, txid: string) => {
            console.log("Payment ready for server completion:", paymentId, "TxID:", txid);
            
            try {
              // Step 6: Frontend sends TxID to server
              console.log("Sending payment for server-side completion...");
              
              const completionResult = await completePayment({
                paymentId,
                txid,
                userId: piUser.uid,
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

              console.log("Payment completed successfully:", paymentId, "TxID:", txid);
              
              // Step 8: Payment flow closes, app becomes visible again
              paymentInProgress = false;
              resolve({
                success: true,
                transactionId: txid,
                message: "Payment successful! Your subscription has been upgraded."
              });
              
            } catch (error) {
              console.error("Error during server-side completion:", error);
              paymentInProgress = false;
              reject(new Error(`Payment completion error: ${error instanceof Error ? error.message : 'Unknown error'}`));
            }
          },

          // User cancelled the payment
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
            
            // Handle specific Pi Network errors
            if (error.message.includes('pending payment') || 
                error.message.includes('action from the developer') ||
                error.message.includes('already have a pending payment')) {
              
              reject(new Error("You already have a pending payment on this app, which needs an action from the developer. Please contact support or try again later."));
            } else {
              reject(error);
            }
          }
        };

        // Step 1: Create payment - Payment Flow UI opens
        console.log("Calling Pi.createPayment...");
        window.Pi?.createPayment(paymentData, callbacks);
        
      } catch (error) {
        console.error("Error creating payment:", error);
        paymentInProgress = false;
        reject(error);
      }
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