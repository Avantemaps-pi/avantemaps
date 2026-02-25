-- Scope the authenticated policy to only the authenticated role
DROP POLICY IF EXISTS "Authenticated users can view businesses" ON public.businesses;
CREATE POLICY "Authenticated users can view businesses" ON public.businesses
  FOR SELECT
  TO authenticated
  USING (
    is_verified = true
    OR is_certified = true
    OR owner_id = (SELECT auth.uid())
  );

-- Scope the public policy to only the anon role
DROP POLICY IF EXISTS "Public can view verified or certified businesses" ON public.businesses;
CREATE POLICY "Public can view verified or certified businesses" ON public.businesses
  FOR SELECT
  TO anon
  USING (is_verified = true OR is_certified = true);