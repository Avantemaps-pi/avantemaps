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

      // 2️⃣ Verify with serverless function (support test mode)
      const testMode = import.meta.env.DEV === true;
      const verification = await verifyPiAuthentication(accessToken, uid, username, testMode);

      if (!verification.verified || !verification.supabase_token || !verification.user) {
        throw new Error(verification.error || 'Pi verification failed');
      }

      // 3️⃣ Always set Supabase session (even in dev/test mode)
      const { error: sessionError } = await supabase.auth.setSession({
        access_token: verification.supabase_token,
        refresh_token: verification.supabase_token,
      });

      if (sessionError) throw new Error('Failed to create Supabase session');

      // 4️⃣ Update local auth context
      setUser({
        uid: verification.user.uid,
        username: verification.user.username,
        walletAddress: verification.user.wallet_address || '',
        session: supabase.auth.session(),
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
