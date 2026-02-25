DROP POLICY IF EXISTS "Deny anonymous access to users" ON public.users;
CREATE POLICY "Deny anonymous access to users" ON public.users
  AS RESTRICTIVE
  FOR SELECT
  TO anon
  USING (false);