/*
 * src/utils/piPayment/payments.ts
 *
 * Ultra-clean, robust TypeScript implementation of Pi Network payment flows.
 * - Uses initializePiNetwork() from core.ts
 * - Strong race protection and deterministic state teardown
 * - Handles incomplete-payment recovery from sessionStorage
 * - Clear, typed callbacks and single-resolve promise guard
 */

import { toast } from 'sonner';
import {
  authenticateUser,
  createPiPayment,
  setIncompletePaymentHandler,
  initializePiNetwork,
  getPiAuthResult
} from '../piNetwork/core';
import { PaymentResult, SubscriptionFrequency } from './types';
import { SubscriptionTier } from '../piNetwork/types';
import type { PaymentData, PaymentCallbacks, PaymentDTO } from '../piNetwork/core';
import { approvePayment, completePayment } from '@/api/payments';

let paymentInProgress = false;
const INCOMPLETE_PAYMENT_SESSION_KEY = 'pi_incomplete_payment';

const log = (...args: any[]) => console.debug('[PiPayment]', ...args);

/**
 * Execute subscription payment using Pi Network
 * Follows the three-phase Pi flow: create -> user interaction -> complete
 */
export const executeSubscriptionPayment = async (
  amount: number,
  tier: SubscriptionTier,
  frequency: SubscriptionFrequency
): Promise<PaymentResult> => {
  // Early guard
  if (paymentInProgress) {
    return { success: false, message: 'A payment is already being processed. Please wait.' };
  }

  paymentInProgress = true;
  // Ensure we always clear state when finished
  let resolved = false;
  const clearAndReturn = (result: PaymentResult) => {
    if (resolved) return result;
    resolved = true;
    paymentInProgress = false;
    log('Payment flow finished:', result);
    // restore default noop handler to avoid leaks
    try {
      setIncompletePaymentHandler(() => {} as any);
    } catch {}
    return result;
  };

  try {
    // Initialize Pi SDK
    const initSuccess = await initializePiNetwork();
    if (!initSuccess) {
      return clearAndReturn({ success: false, message: 'Failed to initialize Pi Network SDK' });
    }

    // Install incomplete payment handler so that any payments reported by the SDK are processed
    setIncompletePaymentHandler((payment: PaymentDTO) => {
      log('Incomplete payment handler invoked:', payment?.identifier);
      // Persist to sessionStorage for safety and also attempt immediate handling
      try {
        sessionStorage.setItem(INCOMPLETE_PAYMENT_SESSION_KEY, JSON.stringify(payment));
      } catch {}
      void handleIncompletePayment(payment);
    });

    // Attempt to reuse existing auth result
    let authResult = getPiAuthResult();
    if (!authResult) {
      log('No cached auth result — authenticating user...');
      authResult = await authenticateUser();
    }

    // If an incomplete payment was cached before this flow, handle it now
    try {
      const raw = sessionStorage.getItem(INCOMPLETE_PAYMENT_SESSION_KEY);
      if (raw) {
        const cached: PaymentDTO = JSON.parse(raw);
        log('Found cached incomplete payment:', cached?.identifier);
        // remove immediately to avoid duplicate handling
        sessionStorage.removeItem(INCOMPLETE_PAYMENT_SESSION_KEY);
        await handleIncompletePayment(cached);
      }
    } catch (e) {
      log('Error while handling cached incomplete payment:', e);
    }

    if (!authResult) {
      return clearAndReturn({ success: false, message: 'User authentication failed' });
    }

    // Build payment data
    const paymentData: PaymentData = {
      amount,
      memo: `Avante Maps ${tier} subscription (${frequency})`,
      metadata: {
        subscriptionTier: tier,
        frequency,
        timestamp: new Date().toISOString()
      }
    };

    log('Creating Pi Network payment', paymentData);

    // Promise wrapper for callback-driven SDK
    return await new Promise<PaymentResult>((resolve) => {
      // guard to ensure resolve/reject only happens once
      let finished = false;
      const once = (res: PaymentResult) => {
        if (finished) return;
        finished = true;
        try {
          resolve(res);
        } finally {
          // ensure top-level state is cleared
          clearAndReturn(res);
        }
      };

      const callbacks: PaymentCallbacks = {
        onReadyForServerApproval: async (paymentId: string) => {
          log('Phase I - Payment ready for server approval:', paymentId);
          try {
            const approvalResult = await approvePayment({
              paymentId,
              userId: authResult!.user.uid,
              amount: paymentData.amount,
              memo: paymentData.memo,
              metadata: paymentData.metadata
            });

            if (!approvalResult.success) {
              log('Server-side approval failed:', approvalResult.message);
              once({ success: false, message: `Payment approval failed: ${approvalResult.message}` });
              return;
            }

            log('Phase I approved:', paymentId);
            // Phase II is handled by Pi's UI — no action required here
          } catch (err) {
            log('Error during server-side approval:', err);
            once({ success: false, message: `Payment approval error: ${err instanceof Error ? err.message : String(err)}` });
          }
        },

        onReadyForServerCompletion: async (paymentId: string, txid: string) => {
          log('Phase III - Payment ready for server completion:', paymentId, txid);
          try {
            const completionResult = await completePayment({
              paymentId,
              txid,
              userId: authResult!.user.uid,
              amount: paymentData.amount,
              memo: paymentData.memo,
              metadata: paymentData.metadata
            });

            if (!completionResult.success) {
              log('Server-side completion failed:', completionResult.message);
              once({ success: false, message: `Payment completion failed: ${completionResult.message}` });
              return;
            }

            log('Payment completed successfully:', paymentId, txid);
            once({
              success: true,
              transactionId: txid,
              message: 'Payment successful! Your subscription has been upgraded.',
              shouldRefreshUser: true
            });
          } catch (err) {
            log('Error during server-side completion:', err);
            once({ success: false, message: `Payment completion error: ${err instanceof Error ? err.message : String(err)}` });
          }
        },

        onCancel: (paymentId: string) => {
          log('Payment cancelled by user:', paymentId);
          once({ success: false, message: 'Payment was cancelled.' });
        },

        onError: (error: Error, payment?: PaymentDTO) => {
          log('Payment error callback:', error, payment);

          // classify common pending-payment scenarios
          const msg = error?.message || '';
          if (msg.includes('pending payment') || msg.includes('already have a pending payment') || msg.includes('action from the developer')) {
            once({ success: false, message: 'You have a pending payment that needs to be resolved. This will be handled automatically.' });
          } else {
            once({ success: false, message: error instanceof Error ? error.message : String(error) });
          }
        }
      };

      // Call createPiPayment and guard synchronous exceptions
      try {
        createPiPayment(paymentData, callbacks);
      } catch (err) {
        log('createPiPayment threw synchronously:', err);
        once({ success: false, message: `Payment initiation failed: ${err instanceof Error ? err.message : String(err)}` });
      }

      // Optional: safety timeout to avoid hanging forever (e.g., SDK never calls callbacks)
      const SAFETY_TIMEOUT = 1000 * 60 * 5; // 5 minutes
      const to = setTimeout(() => {
        if (!finished) {
          log('Payment safety timeout reached — resolving as failed');
          once({ success: false, message: 'Payment timed out. Please try again.' });
        }
      }, SAFETY_TIMEOUT);

      // clean up on resolve
      const origResolve = resolve;
      resolve = (res: PaymentResult) => {
        clearTimeout(to);
        origResolve(res);
      };
    });
  } catch (error) {
    log('Pi payment error (outer):', error);
    return clearAndReturn({ success: false, message: error instanceof Error ? error.message : 'Payment failed' });
  }
};

/**
 * Handle incomplete payment found during authentication or via SDK callback
 */
export const handleIncompletePayment = async (payment: PaymentDTO): Promise<void> => {
  try {
    log('Handling incomplete payment:', payment.identifier);

    // If a txid exists and developer hasn't completed it, attempt completion
    if (payment.transaction?.txid && !payment.status.developer_completed) {
      log('Attempting to complete incomplete payment with txid:', payment.transaction.txid);
      const completionResult = await completePayment({
        paymentId: payment.identifier,
        txid: payment.transaction.txid,
        userId: payment.user_uid,
        amount: payment.amount,
        memo: payment.memo,
        metadata: payment.metadata
      });

      if (completionResult.success) {
        log('Successfully completed incomplete payment:', payment.identifier);
        toast.success('Your previous payment has been processed successfully!');
        // cleanup cached incomplete payment
        try {
          sessionStorage.removeItem(INCOMPLETE_PAYMENT_SESSION_KEY);
        } catch {}
      } else {
        log('Failed to complete incomplete payment:', completionResult.message);
        toast.error('Failed to process your previous payment. Please contact support.');
      }
    } else {
      log('Incomplete payment does not require completion:', payment.identifier);
    }
  } catch (err) {
    log('Error handling incomplete payment:', err);
    toast.error('Error processing incomplete payment. Please contact support.');
  }
};

export const isPaymentInProgress = (): boolean => paymentInProgress;

export const resetPaymentState = (): void => {
  paymentInProgress = false;
  try {
    setIncompletePaymentHandler(() => {} as any);
  } catch {}
  log('Payment state has been reset');
};
