DROP POLICY "Service role can manage contact otps" ON public.contact_otps;

CREATE POLICY "Service role can manage contact otps"
  ON public.contact_otps FOR ALL TO service_role
  USING (true) WITH CHECK (true);