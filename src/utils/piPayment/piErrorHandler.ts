import { toast } from 'sonner';
import { forceResolvePendingPayments } from './cleanup';

/**
 * Specialized error handler for Pi Network SDK errors
 * Focuses on the "pending payment" error specifically
 */

export interface PiErrorDetails {
  code?: string;
  message: string;
  type: 'pending_payment' | 'network_error' | 'user_cancelled' | 'unknown';
}

// Parse Pi Network error messages
export const parsePiError = (error: any): PiErrorDetails => {
  const message = error?.message || error?.toString() || 'Unknown error';
  
  if (message.includes('pending payment')) {
    return {
      code: 'PENDING_PAYMENT',
      message,
      type: 'pending_payment'
    };
  }
  
  if (message.includes('cancelled') || message.includes('user_cancelled')) {
    return {
      code: 'USER_CANCELLED',
      message,
      type: 'user_cancelled'
    };
  }
  
  if (message.includes('network') || message.includes('connection')) {
    return {
      code: 'NETWORK_ERROR',
      message,
      type: 'network_error'
    };
  }
  
  return {
    message,
    type: 'unknown'
  };
};

// Handle Pi Network specific errors with automatic resolution
export const handlePiError = async (error: any): Promise<boolean> => {
  const errorDetails = parsePiError(error);
  console.log('Pi Error Details:', errorDetails);
  
  switch (errorDetails.type) {
    case 'pending_payment':
      toast.loading('Pending payment detected. Attempting automatic resolution…', { id: 'payment:pending' });

      // Attempt automatic cleanup
      const resolved = await forceResolvePendingPayments();

      if (resolved) {
        toast.success('Payment issue resolved! Please try your transaction again.', { id: 'payment:pending', duration: 4000 });
        return true;
      } else {
        toast.error('Could not resolve pending payment automatically. Please contact support.', { id: 'payment:pending', duration: 4000 });
        return false;
      }

      
    case 'user_cancelled':
      toast.info('Payment was cancelled by user', { id: 'payment:cancelled', duration: 4000 });
      return false;
      
    case 'network_error':
      toast.error('Network error occurred. Please check your connection and try again.', { id: 'payment:network-error', duration: 4000 });
      return false;
      
    default:
      toast.error(`Payment error: ${errorDetails.message}`, { id: 'payment:error', duration: 4000 });
      return false;
  }
};

// Wrapper for Pi payment calls with built-in error handling
export const withPiErrorHandling = async <T>(
  paymentFunction: () => Promise<T>
): Promise<T | null> => {
  try {
    return await paymentFunction();
  } catch (error) {
    console.error('Pi payment error:', error);
    
    // Handle the error and check if it was resolved
    const wasResolved = await handlePiError(error);
    
    if (wasResolved) {
      // If error was resolved, suggest user retry
      toast.info('Please try your payment again now.', { id: 'payment:retry', duration: 4000 });
    }
    
    return null;
  }
};