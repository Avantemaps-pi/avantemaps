
-- 1. Vault-managed cron secret for authenticating pg_cron -> internal edge functions
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM vault.secrets WHERE name = 'cron_shared_secret') THEN
    PERFORM vault.create_secret(
      encode(gen_random_bytes(32), 'base64'),
      'cron_shared_secret',
      'Shared secret authenticating pg_cron -> internal edge functions'
    );
  END IF;
END $$;

-- 2. reauth_telemetry: restrict INSERT to authenticated users; auth_uid must match
DROP POLICY IF EXISTS "Anyone can insert reauth telemetry" ON public.reauth_telemetry;

CREATE POLICY "Authenticated users can insert their own reauth telemetry"
  ON public.reauth_telemetry
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth_uid IS NULL OR auth_uid = (SELECT auth.uid())
  );

-- 3. user_roles: explicit admin-only write policies so DB enforces the intent
CREATE POLICY "Only admins can insert user roles"
  ON public.user_roles
  FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role((SELECT auth.uid()), 'admin'::public.app_role));

CREATE POLICY "Only admins can update user roles"
  ON public.user_roles
  FOR UPDATE
  TO authenticated
  USING (public.has_role((SELECT auth.uid()), 'admin'::public.app_role))
  WITH CHECK (public.has_role((SELECT auth.uid()), 'admin'::public.app_role));

CREATE POLICY "Only admins can delete user roles"
  ON public.user_roles
  FOR DELETE
  TO authenticated
  USING (public.has_role((SELECT auth.uid()), 'admin'::public.app_role));

-- 4. message_fees: business owners can view fees paid for their business
CREATE POLICY "Business owners can view message fees for their business"
  ON public.message_fees
  FOR SELECT
  TO authenticated
  USING (public.is_business_owner((SELECT auth.uid()), business_id));
