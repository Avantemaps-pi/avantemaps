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
  // Use full URL to Supabase Edge Function if needed, e.g.:
  // const endpoint = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/verify-pi-auth`;
  const endpoint = '/api/verify-pi-auth';

  const payload = { accessToken, uid, username };

  secureLog.info('Verifying Pi authentication...', { uid, username, tokenLen: accessToken.length });

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok || !data.verified) {
      secureLog.error('Pi verification failed', { status: response.status, body: data });
      return {
        verified: false,
        error: data.error || 'Verification failed',
        details: data.details || 'Unknown error from backend',
        traceId: data.traceId,
      };
    }

    // ✅ Successful verification: return real Supabase JWT
    return {
      verified: true,
      user: data.user,
      supabaseToken: data.supabase_token ?? null, // JWT with 'sub'
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
