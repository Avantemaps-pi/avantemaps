DROP POLICY IF EXISTS "Authenticated can view active AB tests" ON public.notification_ab_tests;
DROP POLICY IF EXISTS "Authenticated can view variants of running tests" ON public.notification_ab_variants;
DROP POLICY IF EXISTS "Anyone can view variants of active tests" ON public.notification_ab_variants;
DROP POLICY IF EXISTS "Authenticated can view active templates" ON public.notification_templates;