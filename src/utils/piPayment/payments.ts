import { toast } from 'sonner';
import { initializePiNetwork, isPiNetworkAvailable } from '../piNetwork';
import { PaymentResult, SubscriptionFrequency } from './types';
import { SubscriptionTier, PaymentDTO, PaymentData, PaymentCallbacks } from '../piNetwork/types';
import { approvePayment, completePayment } from '@/api/payments';
import { supabase } from '@/integrations/supabase/client';
import { forceResolvePendingPayments, canProceedWithPayment, clearLocalPaymentData } from './cleanup';
import { withPiErrorHandling } from './piErrorHandler';

let paymentInProgress = false;

const PAYMENT_TIMEOUT = 60000;
const POLLING_INTERVAL = 2000;

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const cleanupStalePayments = async (userId: string): Promise<void> => {
  try {
    console.log('Cleaning up stale payments before creating new payment...');

    const { data, error } = await supabase.functions.invoke('cleanup-stale-payments', {
      body: JSON.stringify({ userId })
    });

    if (error) {
      console.error('Error cleaning up stale payments:', error);
    } else {
      console.log('Stale payment cleanup result:', data);
      if (data?.cleanedCount > 0) {
        toast.info(`Cleared ${data.cleanedCount} incomplete payment(s) to allow retry`);
      }
    }
  } catch (error) {
    console.error('Error in cleanup process:', error);
  }
};

// Merged + enhanced version
const forceCleanupIncompletePayments = async (): Promise<void> => {
  try {
    console.log('Force cleanup of incomplete payments started...');
    clearLocalPaymentData();

    const piUser = window.Pi?.currentUser;
    if (piUser?.uid) {
      const resolved = await forceResolvePendingPayments();
      if (resolved) {
        toast.success('All payment issues have been resolved. You can now try again.');
      } else {
        toast.warning('Some payment issues may persist. Please wait a moment before retrying.');
      }
    }

    await delay(2000);
  } catch (error) {
    console.error('Error in force cleanup:', error);
    toast.error('Cleanup encountered an issue, but you can still try the payment');
  }
};

export const executeSubscriptionPayment = async (
  amount: number,
  tier: SubscriptionTier,
  frequency: SubscriptionFrequency
): Promise<PaymentResult> => {
  try {
    if (paymentInProgress) {
      console.warn("Payment already in progress");
      return {
        success: false,
        message: "A payment is already being processed. Please wait."
      };
    }

    if (!isPiNetworkAvailable()) {
      throw new Error("Pi Network SDK is not available");
    }

    await initializePiNetwork();

    const piUser = window.Pi?.currentUser;
    if (!piUser?.uid) {
      throw new Error("User not authenticated");
    }

    paymentInProgress = true;

    return new Promise((resolve, reject) => {
      try {
        const paymentData: PaymentData = {
          amount,
          memo: `Avante Maps ${tier} subscription (${frequency})`,
          metadata: {
            subscriptionTier: tier,
            frequency,
            timestamp: new Date().toISOString(),
          }
        };

        console.log("Creating payment with data:", paymentData);

        let approvalTimeoutId: number | undefined;
        let completionTimeoutId: number | undefined;

        const callbacks: PaymentCallbacks = {
          onReadyForServerApproval: async (paymentId: string) => {
            console.log("Payment ready for server approval:", paymentId);
            if (approvalTimeoutId) clearTimeout(approvalTimeoutId);
            approvalTimeoutId = window.setTimeout(() => {
              toast.error("Payment approval timed out. Please try again.");
              paymentInProgress = false;
              reject(new Error("Payment approval timed out"));
            }, 45000);

            if (!piUser?.uid) {
              clearTimeout(approvalTimeoutId);
              paymentInProgress = false;
              reject(new Error("User not authenticated"));
              return;
            }

            localStorage.setItem('pi_incomplete_payment', JSON.stringify({
              paymentId,
              userId: piUser.uid,
              amount: paymentData.amount,
              memo: paymentData.memo,
              metadata: paymentData.metadata
            }));

            let retries = 3;
            let success = false;

            while (retries > 0 && !success) {
              try {
                if (retries < 3) toast.info("Processing payment...");

                const approvalResult = await approvePayment({
                  paymentId,
                  userId: piUser.uid,
                  amount: paymentData.amount,
                  memo: paymentData.memo,
                  metadata: paymentData.metadata
                });

                if (approvalResult.success) {
                  success = true;
                  console.log("Payment approved:", paymentId);
                } else {
                  retries--;
                  await delay((4 - retries) * 1000);
                }
              } catch (error) {
                console.error("Error in approval:", error);
                retries--;
                await delay((4 - retries) * 1000);
              }
            }

            if (!success) {
              clearTimeout(approvalTimeoutId);
              paymentInProgress = false;
              toast.error("Failed to approve payment after multiple attempts");
              reject(new Error("Failed to approve payment"));
            }
          },

          onReadyForServerCompletion: async (paymentId: string, txid: string) => {
            console.log("Payment ready for server completion:", paymentId, txid);
            if (approvalTimeoutId) clearTimeout(approvalTimeoutId);
            completionTimeoutId = window.setTimeout(() => {
              toast.error("Payment completion timed out. Please contact support.");
              paymentInProgress = false;
              reject(new Error("Payment completion timed out"));
            }, 45000);

            let retries = 3;
            let success = false;

            while (retries > 0 && !success) {
              try {
                if (retries < 3) toast.info("Finalizing payment...");

                const completionResult = await completePayment({
                  paymentId,
                  txid,
                  userId: piUser.uid,
                  amount: paymentData.amount,
                  memo: paymentData.memo,
                  metadata: paymentData.metadata
                });

                if (completionResult.success) {
                  success = true;
                  clearTimeout(completionTimeoutId);
                  clearLocalPaymentData();
                  paymentInProgress = false;
                  resolve({
                    success: true,
                    transactionId: txid,
                    message: "Payment successful! Your subscription has been upgraded."
                  });
                } else {
                  retries--;
                  await delay((4 - retries) * 1000);
                }
              } catch (error) {
                console.error("Error in completion:", error);
                retries--;
                await delay((4 - retries) * 1000);
              }
            }

            if (!success) {
              clearTimeout(completionTimeoutId);
              paymentInProgress = false;
              reject(new Error("Failed to complete payment"));
            }
          },

          onCancel: (paymentId: string) => {
            console.log("Payment cancelled:", paymentId);
            if (approvalTimeoutId) clearTimeout(approvalTimeoutId);
            if (completionTimeoutId) clearTimeout(completionTimeoutId);
            clearLocalPaymentData();
            paymentInProgress = false;
            resolve({ success: false, message: "Payment was cancelled." });
          },

          onError: (error: Error, payment?: PaymentDTO) => {
            console.error("Payment error:", error, payment);
            if (approvalTimeoutId) clearTimeout(approvalTimeoutId);
            if (completionTimeoutId) clearTimeout(completionTimeoutId);

            if (error.message.includes('pending payment') || 
                error.message.includes('action from the developer') ||
                error.message.includes('already have a pending payment')) {
              forceCleanupIncompletePayments().then(() => {
                paymentInProgress = false;
                resolve({
                  success: false,
                  message: "Found and resolved pending payment issues. Please try again shortly."
                });
              });
            } else {
              paymentInProgress = false;
              reject(error);
            }
          }
        };

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

export const checkForIncompletePayments = (): PaymentDTO | null => {
  try {
    const storedPayment = localStorage.getItem('pi_incomplete_payment');
    if (storedPayment) {
      const payment: PaymentDTO = JSON.parse(storedPayment);
      console.log('Found incomplete payment:', payment);
      return payment;
    }
    return null;
  } catch (error) {
    console.error('Error checking for incomplete payments:', error);
    return null;
  }
};

export const clearIncompletePayment = (): void => {
  clearLocalPaymentData();
};

export { forceCleanupIncompletePayments };
