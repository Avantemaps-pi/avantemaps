DROP POLICY IF EXISTS "Deny anonymous access to payments" ON public.payments;
CREATE POLICY "Deny anonymous access to payments" ON public.payments
  AS RESTRICTIVE
  FOR SELECT
  TO anon
  USING (false);