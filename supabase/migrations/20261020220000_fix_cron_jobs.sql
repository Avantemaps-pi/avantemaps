
-- 1. Check the cron shared secret inside the database. Edge functions call this
--    via RPC; PostgREST does not expose the vault schema, so they cannot read
--    vault.decrypted_secrets directly. The secret never leaves the database.
CREATE OR REPLACE FUNCTION public.verify_cron_secret(provided text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT COALESCE(
    (
      SELECT ds.decrypted_secret IS NOT NULL AND ds.decrypted_secret = provided
      FROM vault.decrypted_secrets ds
      WHERE ds.name = 'cron_shared_secret'
      LIMIT 1
    ),
    false
  );
$$;

REVOKE ALL ON FUNCTION public.verify_cron_secret(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.verify_cron_secret(text) TO service_role;

-- 2. Daily jobs: send X-Cron-Secret from Vault, drop the legacy anon JWT.
--    cron.schedule with an existing job name replaces that job's command.
SELECT cron.schedule(
  'update-pi-price-daily',
  '0 0 * * *',
  $$
  SELECT net.http_post(
    url := 'https://xvpwbocwasbtzrzrxyvu.supabase.co/functions/v1/update-pi-price',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'X-Cron-Secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'cron_shared_secret' LIMIT 1)
    ),
    body := '{}'::jsonb
  ) AS request_id;
  $$
);

SELECT cron.schedule(
  'cleanup-deleted-accounts-daily',
  '0 3 * * *',
  $$
  SELECT net.http_post(
    url := 'https://xvpwbocwasbtzrzrxyvu.supabase.co/functions/v1/cleanup-deleted-accounts',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'X-Cron-Secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'cron_shared_secret' LIMIT 1)
    ),
    body := '{}'::jsonb
  ) AS request_id;
  $$
);
