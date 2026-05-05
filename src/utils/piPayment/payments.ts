/**
 * Pi Payment Utilities – Clean Rewrite
 * ------------------------------------
 * Works with the new core.ts
 */

import {
  initializePiNetwork,
  createPiPayment,
  getPiAuthResult,
  setIncompletePaymentHandler,
} from '../piNetwork/core';

import type {
  PiPaymentInitiateOptions,
  PaymentCallbacks,
} from '../piNetwork/types';

import { approvePayment, completePayment } from '@/api/payments';
import { supabase } from '@/integrations/supabase/client';
import { generateCorrelationId } from '@/utils/correlation';

// State tracking
let paymentInProgress = false;

export interface PaymentResult {
  success: boolean;
  message: string;
  shouldRefreshUser?: boolean;
  paymentId?: string;
}

/**
 * Ensures the Pi SDK is fully initialized before doing anything.
 */
export async function initPiForPayments(): Promise<void> {
  const ok = await initializePiNetwork();

  if (!ok) {
    throw new Error('Failed to initialize Pi Network SDK');
  }
}

/**
 * Start a payment (full metadata + callbacks).
 * This is now the unified entry point your UI calls.
 */
export async function startPayment(
  options: PiPaymentInitiateOptions,
  callbacks?: PaymentCallbacks
) {
  // Guarantee SDK + auth loaded
  await initPiForPayments();

  const paymentData = {
    amount: options.amount,
    memo: options.memo,
    metadata: options.metadata || {}
  };
  return await createPiPayment(paymentData, callbacks);
}

/**
 * Execute a subscription payment with full flow.
 *
 * NOTE: This is the per-period U2A flow used today. When the Pi Network
 * PiRC2 subscription contract ships and `FEATURE_FLAGS.pirc2Subscriptions`
 * is enabled (see `src/config/featureFlags.ts`), monthly renewals should
 * be driven server-side via an allowance-based charge job instead.
 * Rationale and migration plan: docs/pirc2-integration.md
 */
export async function executeSubscriptionPayment(
  amount: number,
  tier: string,
  frequency: 'monthly' | 'yearly',
  hooks?: { onPaymentId?: (paymentId: string) => void }
): Promise<PaymentResult> {
  if (paymentInProgress) {
    return {
      success: false,
      message: 'A payment is already in progress'
    };
  }
  
  paymentInProgress = true;
  
  try {
    // Ensure SDK is ready
    await initPiForPayments();
    
    // Try cached auth first; if missing, re-authenticate with Pi SDK
    let authResult = getPiAuthResult();
    if (!authResult) {
      try {
        const { authenticate } = await import('../piNetwork/core');
        authResult = await authenticate(['username', 'payments', 'wallet_address']);
      } catch (authError: any) {
        return {
          success: false,
          message: authError.message || 'Please authenticate with Pi Network first'
        };
      }
    }

    // Get Supabase UUID (not Pi UID) for edge function calls
    const { data: { session } } = await supabase.auth.getSession();
    const supabaseUserId = session?.user?.id;
    if (!supabaseUserId) {
      return {
        success: false,
        message: 'Please log in to your account first'
      };
    }

    const normalizedFrequency = frequency === 'yearly' ? 'annual' : frequency;
    const memo = `${tier} subscription (${frequency})`;
    const metadata = {
      subscriptionTier: tier,
      frequency: normalizedFrequency,
    };

    // Single correlation ID for the full approve → complete → status lifecycle.
    const correlationId = generateCorrelationId('subpay');
    const lcLog = (event: string, extra?: Record<string, unknown>) =>
      console.log(
        JSON.stringify({
          ts: new Date().toISOString(),
          level: 'info',
          event,
          fn: 'client.executeSubscriptionPayment',
          correlationId,
          tier,
          frequency: normalizedFrequency,
          ...(extra ?? {}),
        })
      );
    lcLog('lifecycle.start');

    return new Promise<PaymentResult>((resolve) => {
      const callbacks: PaymentCallbacks = {
        onReadyForServerApproval: async (paymentId: string) => {
          console.log('Payment ready for server approval:', paymentId);
          try {
            hooks?.onPaymentId?.(paymentId);
            const approvalResult = await approvePayment({
              paymentId,
              userId: supabaseUserId,
              amount,
              memo,
              metadata
            });
            console.log('Server approval result:', approvalResult);
          } catch (error) {
            console.error('Failed to approve payment:', error);
            resolve({
              success: false,
              message: 'Failed to approve payment on server'
            });
          }
        },
        onReadyForServerCompletion: async (paymentId: string, txid: string) => {
          console.log('Payment ready for completion:', paymentId, txid);
          try {
            const completionResult = await completePayment({
              paymentId,
              userId: supabaseUserId,
              amount,
              memo,
              metadata,
              txid
            });
            console.log('Server completion result:', completionResult);
            resolve({
              success: true,
              message: `Successfully subscribed to ${tier} plan!`,
              shouldRefreshUser: true,
              paymentId
            });
          } catch (error) {
            console.error('Failed to complete payment:', error);
            resolve({
              success: false,
              message: 'Payment completed but failed to update subscription'
            });
          }
        },
        onCancel: (paymentId: string) => {
          console.log('Payment cancelled:', paymentId);
          resolve({
            success: false,
            message: 'Payment was cancelled'
          });
        },
        onError: (error: Error) => {
          console.error('Payment error:', error);
          resolve({
            success: false,
            message: error.message || 'Payment failed'
          });
        }
      };

      createPiPayment({ amount, memo, metadata }, callbacks)
        .catch((error) => {
          console.error('Failed to create payment:', error);
          resolve({
            success: false,
            message: error.message || 'Failed to create payment'
          });
        });
    });
  } catch (error: any) {
    return {
      success: false,
      message: error.message || 'Payment failed'
    };
  } finally {
    paymentInProgress = false;
  }
}

/**
 * Check if a payment is currently in progress
 */
export function isPaymentInProgress(): boolean {
  return paymentInProgress;
}

/**
 * Reset the payment state
 */
export function resetPaymentState(): void {
  paymentInProgress = false;
}

/**
 * Fetches the latest Pi Auth payload from localStorage (if any).
 * Useful for restoring sessions after reload.
 */
export { getPiAuthResult };

/**
 * Registers the cross-session handler for unfinished payments.
 */
export { setIncompletePaymentHandler };
