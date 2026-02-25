DROP POLICY IF EXISTS "Users can create their own reviews" ON public.reviews;
CREATE POLICY "Users can create their own reviews" ON public.reviews FOR INSERT WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can delete their own reviews" ON public.reviews;
CREATE POLICY "Users can delete their own reviews" ON public.reviews FOR DELETE USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can update their own reviews" ON public.reviews;
CREATE POLICY "Users can update their own reviews" ON public.reviews FOR UPDATE USING (user_id = (SELECT auth.uid())) WITH CHECK (user_id = (SELECT auth.uid()));