/**
 * Verify a cron-triggered request against the shared secret stored in
 * Supabase Vault. The comparison runs in the database via the
 * public.verify_cron_secret RPC (service role only), so the secret is never
 * read into the function.
 */
import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

export async function verifyCronRequest(
  req: Request,
  supabase: SupabaseClient,
): Promise<boolean> {
  const provided =
    req.headers.get('x-cron-secret') ??
    req.headers.get('X-Cron-Secret') ??
    '';
  if (!provided) return false;
  const { data, error } = await supabase.rpc('verify_cron_secret', { provided });
  if (error) {
    console.error('cronAuth: verify_cron_secret failed', error);
    return false;
  }
  return data === true;
}
