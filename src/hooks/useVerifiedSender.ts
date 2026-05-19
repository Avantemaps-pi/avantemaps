import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/auth';

/**
 * A "verified sender" owns at least one verified or certified business.
 * Verified senders message businesses for free; everyone else pays the
 * platform-wide unverified message fee.
 */
export function useVerifiedSender() {
  const { user } = useAuth();
  const uid = user?.uid;
  const [isVerifiedSender, setIsVerifiedSender] = useState<boolean | null>(null);

  useEffect(() => {
    if (!uid) {
      setIsVerifiedSender(false);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase.rpc('is_verified_sender', { _uid: uid });
      if (cancelled) return;
      if (error) {
        console.warn('[useVerifiedSender] rpc error', error);
        setIsVerifiedSender(false);
        return;
      }
      setIsVerifiedSender(!!data);
    })();
    return () => {
      cancelled = true;
    };
  }, [uid]);

  return { isVerifiedSender: isVerifiedSender ?? false, loading: isVerifiedSender === null };
}
