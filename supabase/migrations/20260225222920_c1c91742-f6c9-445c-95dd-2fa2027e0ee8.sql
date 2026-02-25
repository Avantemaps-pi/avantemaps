-- Drop the two overlapping permissive SELECT policies for authenticated role
DROP POLICY IF EXISTS "Authenticated users can view verified businesses" ON public.businesses;
DROP POLICY IF EXISTS "Owners can view all their own businesses" ON public.businesses;

-- Merge into a single policy
CREATE POLICY "Authenticated users can view businesses" ON public.businesses
  FOR SELECT
  USING (
    is_verified = true
    OR is_certified = true
    OR owner_id = (SELECT auth.uid())
  );