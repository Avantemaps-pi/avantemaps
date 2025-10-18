import { supabase } from '@/integrations/supabase/client';
import { secureLog } from '@/utils/secureLogger';

export interface VerificationResult {
  verified: boolean;
  error?: string;
  details?: string;
}

export const verifyPiAuthentication = async (
  accessToken: string,
  uid: string,
  username: string
): Promise<VerificationResult> => {
  try {
    secureLog.info(`Verifying Pi Network authentication for user: ${username}`);

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    if (!supabaseUrl) {
      throw new Error('Supabase URL not configured');
    }

    const apiUrl = `${supabaseUrl}/functions/v1/verify-pi-auth`;
    
    secureLog.info(`Calling backend verification endpoint`);

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        accessToken,
        uid,
        username,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));

      secureLog.error('Backend verification failed:', {
        status: response.status,
        error: errorData.error,
        details: errorData.details,
        statusText: response.statusText
      });

      // Provide more specific error messages based on status code
      let errorMessage = errorData.error || 'Verification failed';
      let errorDetails = errorData.details || `Server returned status ${response.status}`;

      if (response.status === 401) {
        errorMessage = 'Invalid authentication token';
        errorDetails = 'Your Pi Network session may have expired. Please try logging in again.';
      } else if (response.status === 403) {
        errorMessage = 'Authentication mismatch';
        errorDetails = 'The provided credentials do not match. Please try again.';
      } else if (response.status === 502 || response.status === 503) {
        errorMessage = 'Pi Network service unavailable';
        errorDetails = 'The Pi Network API is currently unavailable. Please try again in a moment.';
      } else if (response.status === 500) {
        errorMessage = 'Backend verification error';
        errorDetails = 'An error occurred while verifying your credentials. Please try again.';
      }

      return {
        verified: false,
        error: errorMessage,
        details: errorDetails,
      };
    }

    const result = await response.json();

    if (result.verified) {
      secureLog.info('Pi Network authentication verified successfully');
      return {
        verified: true,
      };
    }

    return {
      verified: false,
      error: result.error || 'Verification failed',
      details: result.details || 'Unknown verification error',
    };

  } catch (error) {
    secureLog.error('Network error during Pi authentication verification:', error);

    // Distinguish between different types of network errors
    let errorMessage = 'Network error';
    let errorDetails = 'Unable to verify authentication. Please check your connection and try again.';

    if (error instanceof Error) {
      if (error.message.includes('fetch') || error.message.includes('network')) {
        errorMessage = 'Connection error';
        errorDetails = 'Could not reach the verification server. Please check your internet connection.';
      } else if (error.message.includes('timeout')) {
        errorMessage = 'Verification timeout';
        errorDetails = 'The verification request took too long. Please try again.';
      } else {
        errorDetails = error.message;
      }
    }

    return {
      verified: false,
      error: errorMessage,
      details: errorDetails,
    };
  }
};

export const getDetailedAuthError = (error: any): { message: string; userMessage: string } => {
  if (!error) {
    return {
      message: 'Unknown authentication error',
      userMessage: 'Authentication failed. Please try again.',
    };
  }

  if (error instanceof Error) {
    const errorMessage = error.message.toLowerCase();
    const originalMessage = error.message;

    // Check if error message already contains "authentication failed" to avoid double wrapping
    if (errorMessage.startsWith('authentication failed')) {
      return {
        message: originalMessage,
        userMessage: originalMessage,
      };
    }

    // Detect specific error types
    if (errorMessage.includes('timeout')) {
      return {
        message: originalMessage,
        userMessage: 'Authentication request timed out. Please ensure you have a stable internet connection and try again.',
      };
    }

    if (errorMessage.includes('network') || errorMessage.includes('fetch') || errorMessage.includes('connection')) {
      return {
        message: originalMessage,
        userMessage: 'Network error occurred. Please check your internet connection and try again.',
      };
    }

    if (errorMessage.includes('sdk not available') || errorMessage.includes('pi sdk') || errorMessage.includes('pi is not defined')) {
      return {
        message: originalMessage,
        userMessage: 'Pi Network SDK is not available. Please ensure you are using the official Pi Browser app.',
      };
    }

    if (errorMessage.includes('user denied') || errorMessage.includes('user rejected') || errorMessage.includes('cancelled') || errorMessage.includes('cancel')) {
      return {
        message: originalMessage,
        userMessage: 'Authentication was cancelled. Please try again and approve the permissions.',
      };
    }

    if (errorMessage.includes('permission') && errorMessage.includes('denied')) {
      return {
        message: originalMessage,
        userMessage: 'Permission request was denied. Please try again and approve the requested permissions.',
      };
    }

    if (errorMessage.includes('invalid') || errorMessage.includes('expired')) {
      return {
        message: originalMessage,
        userMessage: 'Authentication token is invalid or expired. Please try authenticating again.',
      };
    }

    if (errorMessage.includes('incomplete') || errorMessage.includes('auth result')) {
      return {
        message: originalMessage,
        userMessage: 'Authentication response was incomplete. This may be a temporary issue - please try again.',
      };
    }

    if (errorMessage.includes('not authenticated') || errorMessage.includes('unauthenticated')) {
      return {
        message: originalMessage,
        userMessage: 'User is not authenticated with Pi Network. Please sign in through the Pi Browser.',
      };
    }

    if (errorMessage.includes('verification failed') || errorMessage.includes('verify')) {
      return {
        message: originalMessage,
        userMessage: 'Could not verify your Pi Network credentials. Please try again.',
      };
    }

    // Handle generic Pi SDK message
    if (errorMessage === 'authentication failed' || errorMessage === 'authentication failed.') {
      return {
        message: originalMessage,
        userMessage: 'Authentication failed. Please approve the Pi login prompt in Pi Browser and ensure you are online, then try again.',
      };
    }

    // Generic error - don't double-wrap
    return {
      message: originalMessage,
      userMessage: originalMessage,
    };
  }

  if (typeof error === 'string') {
    // Check if string already starts with "authentication failed"
    if (error.toLowerCase().startsWith('authentication failed')) {
      return {
        message: error,
        userMessage: error,
      };
    }
    return {
      message: error,
      userMessage: error,
    };
  }

  return {
    message: JSON.stringify(error),
    userMessage: 'An unexpected error occurred during authentication. Please try again.',
  };
};