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
      // CRITICAL: Only call setSession if we have BOTH valid tokens
      // Passing empty/invalid refresh tokens causes "illegal base64" errors
      if (verification.supabaseToken && verification.refreshToken) {
        // Validate that refresh token is actually different from access token
        // and is a non-empty string
        const refreshToken = verification.refreshToken.trim();
        const accessToken = verification.supabaseToken.trim();
        
        if (refreshToken && refreshToken !== accessToken && refreshToken.length > 20) {
          // Clear any existing corrupted session first
          await supabase.auth.signOut();
          
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          
          if (sessionError) {
            // Check for specific refresh token errors
            const errorMsg = sessionError.message?.toLowerCase() || '';
            if (errorMsg.includes('illegal base64') || errorMsg.includes('refresh_token')) {
              console.warn('Invalid refresh token detected, clearing session');
              await supabase.auth.signOut();
              // Clear any corrupted storage
              const keysToRemove = Object.keys(localStorage).filter(key => 
                key.startsWith('sb-') || key.includes('supabase')
              );
              keysToRemove.forEach(key => localStorage.removeItem(key));
            } else {
              console.warn('Session establishment warning:', sessionError.message);
            }
          }
        } else {
          console.info('Skipping setSession: refresh token not valid for session persistence');
        }
      } else {
        console.info('Skipping setSession: missing required tokens for session persistence');
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
