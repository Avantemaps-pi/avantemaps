DROP POLICY "Service role can insert error logs" ON public.error_logs;

CREATE POLICY "Service role can insert error logs"
  ON public.error_logs FOR INSERT TO service_role
  WITH CHECK (true);