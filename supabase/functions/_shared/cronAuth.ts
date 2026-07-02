/**
 * Verify a cron-triggered request against the shared secret stored in
 * Supabase Vault. The value is fetched with the service role client and
 * cached in-memory for the lifetime of the isolate.
 */
import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

let cachedSecret: string | null = null;

async function loadCronSecret(supabase: SupabaseClient): Promise<string | null> {
  if (cachedSecret) return cachedSecret;
  const { data, error } = await supabase
    .schema('vault' as any)
    .from('decrypted_secrets')
    .select('decrypted_secret')
    .eq('name', 'cron_shared_secret')
    .maybeSingle();
  if (error || !data?.decrypted_secret) {
    console.error('cronAuth: failed to load vault secret', error);
    return null;
  }
  cachedSecret = data.decrypted_secret as string;
  return cachedSecret;
}

export async function verifyCronRequest(
  req: Request,
  supabase: SupabaseClient,
): Promise<boolean> {
  const provided =
    req.headers.get('x-cron-secret') ??
    req.headers.get('X-Cron-Secret') ??
    '';
  if (!provided) return false;
  const secret = await loadCronSecret(supabase);
  if (!secret) return false;
  // Constant-time comparison
  if (provided.length !== secret.length) return false;
  let diff = 0;
  for (let i = 0; i < secret.length; i++) {
    diff |= provided.charCodeAt(i) ^ secret.charCodeAt(i);
  }
  return diff === 0;
}
