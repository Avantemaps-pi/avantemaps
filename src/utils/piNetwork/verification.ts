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

      secureLog.error('Pi authentication verification failed:', {
        status: response.status,
        error: errorData.error,
        details: errorData.details
      });

      return {
        verified: false,
        error: errorData.error || 'Verification failed',
        details: errorData.details || `Server returned status ${response.status}`,
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
    secureLog.error('Error during Pi authentication verification:', error);

    return {
      verified: false,
      error: 'Network error',
      details: error instanceof Error
        ? error.message
        : 'Unable to verify authentication. Please check your connection and try again.',
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

    if (errorMessage.includes('timeout')) {
      return {
        message: error.message,
        userMessage: 'Authentication request timed out. Please ensure you have a stable internet connection and try again.',
      };
    }

    if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
      return {
        message: error.message,
        userMessage: 'Network error occurred. Please check your internet connection and try again.',
      };
    }

    if (errorMessage.includes('sdk not available') || errorMessage.includes('pi sdk')) {
      return {
        message: error.message,
        userMessage: 'Pi Network SDK is not available. Please ensure you are using the official Pi Browser app.',
      };
    }

    if (errorMessage.includes('user denied') || errorMessage.includes('user rejected') || errorMessage.includes('cancelled')) {
      return {
        message: error.message,
        userMessage: 'Authentication was cancelled. Please try again and approve the permissions.',
      };
    }

    if (errorMessage.includes('invalid') || errorMessage.includes('expired')) {
      return {
        message: error.message,
        userMessage: 'Authentication token is invalid or expired. Please try authenticating again.',
      };
    }

    if (errorMessage.includes('incomplete') || errorMessage.includes('auth result')) {
      return {
        message: error.message,
        userMessage: 'Authentication response was incomplete. This may be a temporary issue - please try again.',
      };
    }

    return {
      message: error.message,
      userMessage: `Authentication failed: ${error.message}`,
    };
  }

  if (typeof error === 'string') {
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
