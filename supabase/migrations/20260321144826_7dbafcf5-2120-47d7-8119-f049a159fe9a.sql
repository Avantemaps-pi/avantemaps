DROP POLICY "Service role can manage rate limits" ON public.api_rate_limits;

CREATE POLICY "Service role can manage rate limits"
  ON public.api_rate_limits FOR ALL TO service_role
  USING (true) WITH CHECK (true);