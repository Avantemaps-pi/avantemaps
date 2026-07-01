
-- 1. Fix mutable search_path on enforce_business_limit
CREATE OR REPLACE FUNCTION public.enforce_business_limit()
RETURNS TRIGGER AS $$
DECLARE
  current_count INTEGER;
  user_subscription TEXT;
  business_limit INTEGER;
BEGIN
  SELECT subscription INTO user_subscription FROM public.users WHERE id = NEW.owner_id;

  business_limit := CASE
    WHEN user_subscription = 'small-business' THEN 3
    WHEN user_subscription = 'organization' THEN 5
    ELSE 1
  END;

  SELECT COUNT(*) INTO current_count FROM public.businesses WHERE owner_id = NEW.owner_id;

  IF current_count >= business_limit THEN
    RAISE EXCEPTION 'Business limit reached. Your % plan allows up to % business(es).',
      user_subscription, business_limit;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2. Restrict notification_ab_tests anon SELECT -> authenticated only
DROP POLICY IF EXISTS "Anon can view active AB tests" ON public.notification_ab_tests;
CREATE POLICY "Authenticated can view active AB tests"
  ON public.notification_ab_tests
  FOR SELECT
  TO authenticated
  USING (status = 'active');
REVOKE SELECT ON public.notification_ab_tests FROM anon;

-- 3. Restrict notification_templates public SELECT -> authenticated only
DROP POLICY IF EXISTS "Anyone can view active templates" ON public.notification_templates;
CREATE POLICY "Authenticated can view active templates"
  ON public.notification_templates
  FOR SELECT
  TO authenticated
  USING (is_active = true);
REVOKE SELECT ON public.notification_templates FROM anon;

-- 4. Drop duplicate/incorrect storage policies on business-images
DROP POLICY IF EXISTS "Owners can update their own business images" ON storage.objects;
DROP POLICY IF EXISTS "Owners can delete their own business images" ON storage.objects;

-- 5. Harden users UPDATE policy to prevent pi_uid and subscription self-modification
DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;
CREATE POLICY "Users can update their own profile"
  ON public.users
  FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = id)
  WITH CHECK (
    (SELECT auth.uid()) = id
    AND subscription IS NOT DISTINCT FROM (SELECT u.subscription FROM public.users u WHERE u.id = (SELECT auth.uid()))
    AND pi_uid IS NOT DISTINCT FROM (SELECT u.pi_uid FROM public.users u WHERE u.id = (SELECT auth.uid()))
  );
