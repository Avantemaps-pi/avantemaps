-- Drop and recreate policies with optimized auth.uid() calls
DROP POLICY IF EXISTS "Users can view their own searches" ON public.user_searches;
CREATE POLICY "Users can view their own searches" ON public.user_searches FOR SELECT USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert their own searches" ON public.user_searches;
CREATE POLICY "Users can insert their own searches" ON public.user_searches FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can delete their own searches" ON public.user_searches;
CREATE POLICY "Users can delete their own searches" ON public.user_searches FOR DELETE USING ((SELECT auth.uid()) = user_id);