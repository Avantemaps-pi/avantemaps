import { secureLog } from './secureLogger';

export interface PiUser {
  uid: string;
  username: string;
  wallet_address?: string | null;
}

export interface VerificationResult {
  verified: boolean;
  user?: PiUser;
  supabaseToken?: string | null;
  error?: string;
  details?: string;
  traceId?: string;
}

export const verifyPiAuthentication = async (
  accessToken: string,
  uid: string,
  username: string
): Promise<VerificationResult> => {
  const endpoint = '/api/verify-pi-auth'; // or full Supabase function URL

  const payload = { accessToken, uid, username };

  secureLog.info('Verifying Pi authentication...', { uid, username, tokenLen: accessToken.length });

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      secureLog.error('Pi verification failed', { status: response.status, body: data });
      return {
        verified: false,
        error: data.error || 'Verification failed',
        details: data.details || 'Unknown error from backend',
        traceId: data.traceId,
      };
    }

    if (!data.verified) {
      return {
        verified: false,
        error: data.error || 'Verification failed',
        details: data.details || 'Pi backend did not verify the token',
        traceId: data.traceId,
      };
    }

    return {
      verified: true,
      user: data.user,
      supabaseToken: data.supabase_token ?? null,
      traceId: data.traceId,
    };
  } catch (err: any) {
    secureLog.error('Network error during Pi verification', err);
    return {
      verified: false,
      error: 'Network error',
      details: err?.message || 'Could not reach verification server',
    };
  }
};
