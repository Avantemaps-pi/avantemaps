import {
  initializePiNetwork,
  createPiPayment,
  setIncompletePaymentHandler,
  getPiAuthResult,
  determineSandboxMode
} from '../piNetwork/core';

/**
 * Full Payment Flow:
 * 1. Initialize Pi Network SDK
 * 2. Authenticate user if needed
 * 3. Create a payment
 * 4. Call your server to approve
 * 5. Complete the payment
 * 6. Handle incomplete payments
 */

export interface PiPaymentMetadata {
  businessId?: string;
  subscriptionTier?: string;
  [key: string]: any;
}

export interface CreatePaymentInput {
  amount: number;
  memo: string;
  metadata?: PiPaymentMetadata;
}

export interface ServerPaymentResponse {
  status: 'ok' | 'error';
  error?: string;
}

export interface PaymentResult {
  ok: boolean;
  paymentId?: string;
  error?: string;
  raw?: any;
}

let initialized = false;

async function ensureInitialized(): Promise<void> {
  if (!initialized) {
    await initializePiNetwork();
    initialized = true;
  }
}

async function authenticateIfNeeded() {
  const result = await getPiAuthResult();
  if (result?.user) return result.user;
  throw new Error('User is not authenticated with Pi.');
}

async function approvePaymentOnServer(paymentId: string): Promise<ServerPaymentResponse> {
  const res = await fetch('/api/pi/approve', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ paymentId })
  });
  return res.json();
}

async function completePaymentOnServer(paymentId: string): Promise<ServerPaymentResponse> {
  const res = await fetch('/api/pi/complete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ paymentId })
  });
  return res.json();
}

export function registerIncompletePaymentHandler() {
  setIncompletePaymentHandler(async (payment) => {
    if (!payment.identifier) return;

    try {
      await approvePaymentOnServer(payment.identifier);
      await completePaymentOnServer(payment.identifier);
    } catch (err) {
      console.error('Failed incomplete payment recovery:', err);
    }
  });
}

export async function createFullPayment(
  input: CreatePaymentInput
): Promise<PaymentResult> {
  try {
    await ensureInitialized();

    const user = await authenticateIfNeeded();
    if (!user) throw new Error('Pi authentication failed.');

    const sandbox = determineSandboxMode();

    const payment = await createPiPayment({
      amount: input.amount,
      memo: input.memo,
      metadata: input.metadata ?? {},
      sandbox,
    });

    if (!payment?.identifier) {
      throw new Error('Payment was created but returned no identifier.');
    }

    const approved = await approvePaymentOnServer(payment.identifier);
    if (approved.status !== 'ok') {
      throw new Error(approved.error || 'Server approval failed.');
    }

    const completed = await completePaymentOnServer(payment.identifier);
    if (completed.status !== 'ok') {
      throw new Error(completed.error || 'Server completion failed.');
    }

    return {
      ok: true,
      paymentId: payment.identifier,
      raw: payment
    };
  } catch (err: any) {
    return {
      ok: false,
      error: err?.message || 'Unknown error in createFullPayment'
    };
  }
}
