import { secureLog } from './secureLogger';

export interface PiUser {
  uid: string;           // Supabase UUID (from auth.uid())
  pi_uid: string;        // Pi Network UID
  username: string;
  wallet_address?: string | null;
}

export interface VerificationResult {
  verified: boolean;
  user?: PiUser;
  supabaseToken?: string | null;
  refreshToken?: string | null;
  testMode?: boolean;
  error?: string;
  details?: string;
  traceId?: string;
}

export type VerifyPiAuthResult = VerificationResult;

export const verifyPiAuthentication = async (
  accessToken: string,
  uid: string,
  username: string
): Promise<VerificationResult> => {
  // Use full Supabase URL for edge function
  const SUPABASE_URL = 'https://xvpwbocwasbtzrzrxyvu.supabase.co';
  const endpoint = `${SUPABASE_URL}/functions/v1/verify-pi-auth`;

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
      supabaseToken: data.supabase_token ?? null,
      refreshToken: data.refresh_token ?? null,
      testMode: data.testMode ?? false,
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
