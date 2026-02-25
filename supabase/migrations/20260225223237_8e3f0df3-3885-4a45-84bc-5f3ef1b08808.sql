DROP POLICY IF EXISTS "Owners can view their business analytics" ON public.business_views;
CREATE POLICY "Owners can view their business analytics" ON public.business_views
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM businesses
    WHERE businesses.id = business_views.business_id
      AND businesses.owner_id = (SELECT auth.uid())
  ));