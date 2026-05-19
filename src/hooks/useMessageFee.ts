import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Resolves the current per-message fee for unverified senders, in Pi and USD.
 * The Pi amount is pulled from `platform_settings.unverified_message_fee_pi`
 * (Phase 1 — single platform-wide value). USD is derived from `pi_price`.
 */
export function useMessageFee() {
  const [feePi, setFeePi] = useState<number>(0.5);
  const [feeUsd, setFeeUsd] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [{ data: setting }, { data: price }] = await Promise.all([
        supabase
          .from('platform_settings')
          .select('value')
          .eq('key', 'unverified_message_fee_pi')
          .maybeSingle(),
        supabase.from('pi_price').select('price_usd').limit(1).maybeSingle(),
      ]);
      if (cancelled) return;
      const pi = Number(setting?.value ?? 0.5);
      const usd = pi * Number(price?.price_usd ?? 0);
      setFeePi(pi);
      setFeeUsd(usd);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return { feePi, feeUsd, loading };
}
