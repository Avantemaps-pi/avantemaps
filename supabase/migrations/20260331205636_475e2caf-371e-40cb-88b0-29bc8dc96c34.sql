-- Consolidate two permissive SELECT policies on user_roles into one
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;

CREATE POLICY "Users can view own roles or admins all"
  ON public.user_roles
  FOR SELECT
  TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR has_role((SELECT auth.uid()), 'admin'::app_role)
  );