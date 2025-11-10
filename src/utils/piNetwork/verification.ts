import { supabase } from '@/integrations/supabase/client';
import { secureLog } from '@/utils/secureLogger';

export interface VerificationResult {
  verified: boolean;
  supabaseToken?: string | null;
  error?: string;
  details?: string;
  traceId?: string;
}

export const verifyPiAuthentication = async (
  accessToken: string,
  uid: string,
  username: string,
  testMode: boolean = false
): Promise<VerificationResult> => {
  try {
    // Sanitize inputs
    const sanitizedUid = uid.trim();
    const sanitizedUsername = username.trim();

    secureLog.info(`Verifying Pi Network authentication for user: ${sanitizedUsername}${testMode ? ' (test mode)' : ''}`);
    
    const requestBody = {
      accessToken,
      uid: sanitizedUid,
      username: sanitizedUsername,
    };
    
    secureLog.info('Calling verify-pi-auth with payload', { 
      uid: sanitizedUid, 
      username: sanitizedUsername, 
      tokenLen: accessToken.length,
      testMode,
      bodyString: JSON.stringify(requestBody).substring(0, 100)
    });

    // Try primary method: Supabase functions invoke
    let data, error;
    try {
      const functionName = testMode ? 'verify-pi-auth?test=true' : 'verify-pi-auth';
      const result = await supabase.functions.invoke(functionName, {
        body: requestBody,
      });
      data = result.data;
      error = result.error;
      
      if (error) {
        secureLog.error('Supabase invoke error:', { 
          status: (error as any)?.status, 
          message: error.message,
          fullError: JSON.stringify(error).substring(0, 200)
        });
      }
    } catch (invokeError) {
      secureLog.error('Supabase invoke threw exception:', invokeError);
      error = invokeError;
    }

    // If Supabase invoke failed, try fallback direct fetch
    if (error && !data) {
      secureLog.info('Primary method failed, trying fallback direct fetch...');
      
      try {
        const fallbackUrl = testMode 
          ? 'https://xvpwbocwasbtzrzrxyvu.supabase.co/functions/v1/verify-pi-auth?test=true'
          : 'https://xvpwbocwasbtzrzrxyvu.supabase.co/functions/v1/verify-pi-auth';
        
        const response = await fetch(fallbackUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh2cHdib2N3YXNidHpyenJ4eXZ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI4MDE2NjUsImV4cCI6MjA1ODM3NzY2NX0.J8yp04TRmdyM_l5FaOFP7Elz16n1ZlQkawH5Xp1vCs0',
          },
          body: JSON.stringify(requestBody),
        });

        if (response.ok) {
          data = await response.json();
          error = null;
          secureLog.info('Fallback fetch succeeded');
        } else {
          const errorText = await response.text();
          secureLog.error('Fallback fetch failed:', { status: response.status, body: errorText });
          error = { status: response.status, message: errorText };
        }
      } catch (fetchError) {
        secureLog.error('Fallback fetch threw exception:', fetchError);
        // Keep the original error
      }
    }

    if (error) {
      const status = (error as any)?.status ?? 500;
      secureLog.error('Backend verification failed:', {
        status,
        error: error.message,
      });

      let errorMessage = 'Verification failed';
      let errorDetails = `Server returned status ${status}`;

      if (status === 401) {
        errorMessage = 'Invalid authentication token';
        errorDetails = 'Your Pi session likely expired or is invalid. Please open the app in the official Pi Browser and try again.';
      } else if (status === 403) {
        errorMessage = 'Authentication mismatch';
        errorDetails = 'The provided credentials do not match. Please try again.';
      } else if (status === 502 || status === 503) {
        errorMessage = 'Pi Network service unavailable';
        errorDetails = 'The Pi Network API is currently unavailable. Please try again in a moment.';
      } else if (status === 500) {
        errorMessage = 'Backend verification error';
        errorDetails = 'An error occurred while verifying your credentials. Please try again.';
      }

      return {
        verified: false,
        error: errorMessage,
        details: errorDetails,
      };
    }

    const result = data as any;

    if (result?.verified) {
      secureLog.info('Pi Network authentication verified successfully', {
        hasSupabaseToken: !!result.supabase_token,
        hasTraceId: !!result.traceId
      });
      return { 
        verified: true,
        supabaseToken: result.supabase_token ?? null,
        traceId: result.traceId
      };
    }

    return {
      verified: false,
      error: result.error || 'Verification failed',
      details: result.details || 'Unknown verification error',
      traceId: result.traceId
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
        userMessage: 'Your Pi session likely expired or is invalid. Please open the app in the official Pi Browser and try again.',
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

    // Handle generic Pi SDK message - provide more helpful guidance
    if (errorMessage === 'authentication failed' || errorMessage === 'authentication failed.') {
      return {
        message: originalMessage,
        userMessage: 'Unable to complete Pi Network authentication. Please ensure you:\n1. Are using the official Pi Browser app\n2. Have approved the login permissions\n3. Have a stable internet connection\n\nIf the issue persists, try restarting the Pi Browser app.',
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