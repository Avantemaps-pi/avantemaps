DROP POLICY IF EXISTS "Anon delete consolidated" ON public.comments;
DROP POLICY IF EXISTS "Anyone can view variants of active tests" ON public.notification_ab_variants;
CREATE POLICY "Authenticated can view variants of running tests" ON public.notification_ab_variants FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.notification_ab_tests t WHERE t.id = notification_ab_variants.ab_test_id AND t.status = 'running'));
REVOKE SELECT ON public.notification_ab_variants FROM anon;
REVOKE SELECT ON public.notification_ab_tests FROM anon;
REVOKE SELECT ON public.notification_templates FROM anon;