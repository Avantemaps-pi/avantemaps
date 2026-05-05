
/**
 * Payment API types
 */

export interface PaymentRequest {
  paymentId: string;
  userId: string;
  amount: number;
  memo: string;
  metadata: Record<string, any>;
}

export interface PaymentResponse {
  success: boolean;
  message: string;
  paymentId?: string;
  txid?: string;
  status?: PaymentStatus;
  /** End-to-end correlation ID linking client + server logs for this attempt. */
  correlationId?: string;
}

export interface PaymentStatus {
  paymentId: string;
  txid?: string;
  verified: boolean;
  completed: boolean;
  cancelled: boolean;
  error?: string;
}

export interface StoredPayment {
  id: string;
  userId: string;
  amount: number;
  memo: string;
  metadata: Record<string, any>;
  txid?: string;
  status: {
    verified: boolean;
    completed: boolean;
    cancelled: boolean;
    error?: string;
  };
  createdAt: number;
  updatedAt: number;
}

// In-memory store kept for backward compatibility during transition
// Will be deprecated once database integration is complete
export const paymentStore: Record<string, StoredPayment> = {};
