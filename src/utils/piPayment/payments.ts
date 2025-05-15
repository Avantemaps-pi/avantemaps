import { toast } from 'sonner';
import { initializePiNetwork, isPiNetworkAvailable } from '../piNetwork';
import { PaymentResult, SubscriptionFrequency } from './types';
import { SubscriptionTier, PaymentDTO, PaymentData, PaymentCallbacks } from '../piNetwork/types';
import { approvePayment, completePayment } from '@/api/payments';

let paymentInProgress = false;

const PAYMENT_TIMEOUT = 60000;
const POLLING_INTERVAL = 2000;

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

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

    paymentInProgress = true;

    if (!isPiNetworkAvailable()) {
      throw new Error("Pi Network SDK is not available");
    }

    await initializePiNetwork();

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
              console.error("Payment approval timed out");
              toast.error("Payment approval timed out. Please try again.");
              paymentInProgress = false;
              reject(new Error("Payment approval timed out"));
            }, 45000);

            const piUser = window.Pi?.currentUser;
            if (!piUser?.uid) {
              clearTimeout(approvalTimeoutId);
              paymentInProgress = false;
              reject(new Error("User not authenticated"));
              return;
            }

            // Save incomplete payment
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
                if (retries < 3) {
                  toast.info("Processing payment...");
                }

                const approvalResult = await approvePayment({
                  paymentId,
                  userId: piUser.uid,
                  amount: paymentData.amount,
                  memo: paymentData.memo,
                  metadata: paymentData.metadata
                });

                if (approvalResult.success) {
                  success = true;
                  console.log("Payment approved successfully:", paymentId);
                } else {
                  console.warn(`Approval attempt failed (${retries} left):`, approvalResult.message);
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
              reject(new Error("Failed to approve payment after multiple attempts"));
            }
          },

          onReadyForServerCompletion: async (paymentId: string, txid: string) => {
            console.log("Payment ready for server completion:", paymentId, txid);

            if (approvalTimeoutId) clearTimeout(approvalTimeoutId);

            completionTimeoutId = window.setTimeout(() => {
              console.error("Payment completion timed out");
              toast.error("Payment completion timed out. Please contact support.");
              paymentInProgress = false;
              reject(new Error("Payment completion timed out"));
            }, 45000);

            const piUser = window.Pi?.currentUser;
            if (!piUser?.uid) {
              clearTimeout(completionTimeoutId);
              paymentInProgress = false;
              reject(new Error("User not authenticated"));
              return;
            }

            let retries = 3;
            let success = false;

            while (retries > 0 && !success) {
              try {
                if (retries < 3) {
                  toast.info("Finalizing payment...");
                }

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
                  console.log("Payment completed successfully:", paymentId, txid);
                  if (completionTimeoutId) clearTimeout(completionTimeoutId);

                  clearIncompletePayment(); // clear saved payment

                  paymentInProgress = false;
                  resolve({
                    success: true,
                    transactionId: txid,
                    message: "Payment successful! Your subscription has been upgraded."
                  });
                } else {
                  console.warn(`Completion attempt failed (${retries} left):`, completionResult.message);
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
              reject(new Error("Failed to complete payment after multiple attempts"));
            }
          },

          onCancel: (paymentId: string) => {
            console.log("Payment cancelled:", paymentId);
            if (approvalTimeoutId) clearTimeout(approvalTimeoutId);
            if (completionTimeoutId) clearTimeout(completionTimeoutId);

            clearIncompletePayment();

            paymentInProgress = false;
            resolve({
              success: false,
              message: "Payment was cancelled."
            });
          },

          onError: (error: Error, payment?: PaymentDTO) => {
            console.error("Payment error:", error, payment);
            if (approvalTimeoutId) clearTimeout(approvalTimeoutId);
            if (completionTimeoutId) clearTimeout(completionTimeoutId);

            paymentInProgress = false;
            reject(error);
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
  try {
    localStorage.removeItem('pi_incomplete_payment');
  } catch (error) {
    console.error('Error clearing incomplete payment:', error);
  }
};
