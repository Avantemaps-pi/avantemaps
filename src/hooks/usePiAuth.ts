import { useState } from 'react';
import { useAuth } from '@/context/auth';
import { verifyPiAuthentication, VerifyPiAuthResult } from '@/utils/verifyPiAuthentication';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface UsePiAuthReturn {
  loginWithPi: () => Promise<void>;
  loading: boolean;
  error?: string;
}

export function usePiAuth(): UsePiAuthReturn {
  const { setUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();

  const loginWithPi = async () => {
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
      const verification: VerifyPiAuthResult = await verifyPiAuthentication({
        accessToken,
        uid,
        username,
      });

      if (!verification.verified || !verification.supabase_token) {
        throw new Error(verification.error || 'Pi verification failed');
      }

      // 3️⃣ Set Supabase session directly
      const { data: sessionData, error: sessionError } = await supabase.auth.setSession(
        verification.supabase_token
      );

      if (sessionError) {
        throw new Error('Failed to set Supabase session');
      }

      // 4️⃣ Update Auth context
      setUser({
        uid: verification.user!.uid,
        username: verification.user!.username,
        walletAddress: verification.user!.wallet_address || '',
        session: sessionData?.session || null,
      });

      toast.success(`Welcome, ${verification.user!.username}!`);
    } catch (err: any) {
      console.error('Pi login error:', err);
      setError(err.message);
      toast.error(err.message || 'Pi login failed');
    } finally {
      setLoading(false);
    }
  };

  return { loginWithPi, loading, error };
}
