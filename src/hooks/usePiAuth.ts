import { useCallback, useState } from 'react';
import { useAuth } from '@/context/auth';
import { supabase } from '@/integrations/supabase/client';
import { secureLog } from '@/utils/secureLogger';

interface UsePiAuthReturn {
  /**
   * Thin wrapper around the single, hardened Pi login path (AuthProvider.login
   * -> performLogin). Resolves true when a Supabase session exists afterwards.
   */
  loginWithPi: () => Promise<boolean>;
  loading: boolean;
  error?: string;
}

export function usePiAuth(): UsePiAuthReturn {
  const { login, isLoading, authError } = useAuth();
  const [pending, setPending] = useState(false);

  const loginWithPi = useCallback(async (): Promise<boolean> => {
    setPending(true);
    try {
      // performLogin handles: SDK init, Pi Browser checks, 120s auth timeout,
      // backend verification, supabase.auth.setSession, and setUser.
      await login();

      const { data, error } = await supabase.auth.getUser();
      if (error || !data.user) {
        secureLog.warn('Pi login finished without an authenticated Supabase session');
        return false;
      }
      return true;
    } catch (err) {
      secureLog.error('Pi login failed', err);
      return false;
    } finally {
      setPending(false);
    }
  }, [login]);

  return {
    loginWithPi,
    loading: pending || isLoading,
    ...(authError ? { error: authError } : {}),
  };
}
