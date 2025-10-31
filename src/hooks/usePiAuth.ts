import { useState } from 'react';
import { useAuth } from '@/context/auth';
import { verifyPiAuthentication, VerifyPiAuthResult } from '@/utils/verifyPiAuthentication';
import { toast } from 'sonner';

interface UsePiAuthReturn {
  loginWithPi: () => Promise<void>;
  loading: boolean;
  error?: string;
}

export function usePiAuth(): UsePiAuthReturn {
  const { setUser, refreshUser } = useAuth(); // assumes you have setUser in context
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
        // Optional: requested scopes
        scopes: ['username', 'wallet_address'],
      });

      const { uid, username, accessToken } = authResponse;

      if (!uid || !username || !accessToken) {
        throw new Error('Pi authentication failed or incomplete');
      }

      // 2️⃣ Verify on Supabase serverless function
      const verification: VerifyPiAuthResult = await verifyPiAuthentication({
        accessToken,
        uid,
        username,
      });

      if (!verification.verified || !verification.supabase_token) {
        throw new Error(verification.error || 'Pi verification failed');
      }

      // 3️⃣ Set Supabase session with returned token
      const token = verification.supabase_token;
      const { error: sessionError } = await fetch('/api/supabase-set-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessToken: token }),
      }).then(res => res.json());

      if (sessionError) {
        throw new Error('Failed to set Supabase session');
      }

      // 4️⃣ Update user context
      setUser({
        uid: verification.user!.uid,
        username: verification.user!.username,
        walletAddress: verification.user!.wallet_address || '',
        subscriptionTier: 'individual', // default, replace if needed
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
