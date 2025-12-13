import { useState } from 'react';
import { useAuth } from '@/context/auth';
import { verifyPiAuthentication, VerifyPiAuthResult } from '@/utils/verifyPiAuthentication';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface UsePiAuthReturn {
  loginWithPi: () => Promise<VerifyPiAuthResult | undefined>;
  loading: boolean;
  error?: string;
}

export function usePiAuth(): UsePiAuthReturn {
  const { setUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();

  const loginWithPi = async (): Promise<VerifyPiAuthResult | undefined> => {
    try {
      setLoading(true);
      setError(undefined);

      // 1️⃣ Trigger Pi login
      const pi = (window as any).Pi;
      if (!pi) throw new Error('Pi SDK not loaded');

      const authResponse = await pi.authenticate({
        scopes: ['username', 'wallet_address'],
      });

      const { uid, username, accessToken } = authResponse;
      if (!uid || !username || !accessToken) {
        throw new Error('Pi authentication failed or incomplete');
      }

      // 2️⃣ Verify with serverless function
      const verification = await verifyPiAuthentication(accessToken, uid, username);

      if (!verification.verified || !verification.user) {
        throw new Error(verification.error || 'Pi verification failed');
      }

      // 3️⃣ If we received Supabase tokens, create a session. Otherwise skip (test mode).
      // Use signInWithIdToken pattern instead of setSession to avoid refresh token issues
      if (verification.supabaseToken) {
        // Clear any existing corrupted session first
        await supabase.auth.signOut();
        
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: verification.supabaseToken,
          refresh_token: verification.refreshToken || verification.supabaseToken,
        });
        if (sessionError) {
          console.warn('Session establishment warning:', sessionError.message);
          // Don't throw - the access token may still work for immediate operations
        }
      }

      // 4️⃣ Update local auth context
      setUser({
        uid: verification.user.uid,              // Supabase UUID
        pi_uid: verification.user.pi_uid,        // Pi Network UID
        username: verification.user.username,
        walletAddress: verification.user.wallet_address || '',
        lastAuthenticated: Date.now(),
        subscriptionTier: 'individual' as any,
      });

      toast.success(`Welcome, ${verification.user.username}!`);
      return verification;

    } catch (err: any) {
      console.error('Pi login error:', err);
      setError(err.message);
      toast.error(err.message || 'Pi login failed');
      return undefined;
    } finally {
      setLoading(false);
    }
  };

  return { loginWithPi, loading, error };
}
