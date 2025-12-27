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

      // 3️⃣ If we received Supabase tokens, create a session
      // Only require refresh token to be non-empty and different from access token
      if (verification.supabaseToken && verification.refreshToken) {
        const refreshToken = verification.refreshToken.trim();
        const accessToken = verification.supabaseToken.trim();
        
        // Only reject if refresh token is empty or same as access token
        if (refreshToken && refreshToken !== accessToken) {
          // Clear any existing corrupted session first
          await supabase.auth.signOut();
          
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          
          if (sessionError) {
            const errorMsg = sessionError.message?.toLowerCase() || '';
            if (errorMsg.includes('illegal base64') || errorMsg.includes('refresh_token')) {
              console.warn('Invalid refresh token detected, clearing session');
              await supabase.auth.signOut();
              const keysToRemove = Object.keys(localStorage).filter(key => 
                key.startsWith('sb-') || key.includes('supabase')
              );
              keysToRemove.forEach(key => localStorage.removeItem(key));
            }
            // Don't throw - session setup is nice-to-have, not critical
          }
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
