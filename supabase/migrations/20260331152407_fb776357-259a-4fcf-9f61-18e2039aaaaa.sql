
-- Fix 1: Replace overly permissive public SELECT on notification_frequency_caps with service_role only
DROP POLICY IF EXISTS "Service can read frequency caps" ON public.notification_frequency_caps;

CREATE POLICY "Service role can read frequency caps"
  ON public.notification_frequency_caps
  FOR SELECT
  TO service_role
  USING (true);

-- Fix 2: Drop dead anon SELECT policy on user_roles and add authenticated self-read
DROP POLICY IF EXISTS "Admins select consolidated" ON public.user_roles;

CREATE POLICY "Users can view their own roles"
  ON public.user_roles
  FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Admins can view all roles"
  ON public.user_roles
  FOR SELECT
  TO authenticated
  USING ((SELECT has_role((SELECT auth.uid()), 'admin'::app_role)));
