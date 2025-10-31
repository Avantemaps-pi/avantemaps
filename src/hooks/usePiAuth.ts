// src/utils/verifyPiAuthentication.ts
export interface VerifyPiAuthResult {
  verified: boolean;
  user?: {
    uid: string;
    username: string;
    wallet_address?: string | null;
  };
  supabase_token?: string | null;
  error?: string;
  details?: string;
  traceId?: string;
}

interface VerifyPiAuthParams {
  accessToken: string;
  uid: string;
  username: string;
}

/**
 * Call the Supabase serverless function to verify Pi authentication.
 */
export async function verifyPiAuthentication({
  accessToken,
  uid,
  username,
}: VerifyPiAuthParams): Promise<VerifyPiAuthResult> {
  try {
    const response = await fetch('/api/verify-pi-auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accessToken, uid, username }),
    });

    const data: VerifyPiAuthResult = await response.json();

    if (!response.ok) {
      return {
        verified: false,
        error: data.error || 'Verification failed',
        details: data.details,
        traceId: data.traceId,
      };
    }

    return data;
  } catch (err: any) {
    console.error('❌ verifyPiAuthentication error:', err);
    return {
      verified: false,
      error: err.message || 'Network or unexpected error',
    };
  }
}
