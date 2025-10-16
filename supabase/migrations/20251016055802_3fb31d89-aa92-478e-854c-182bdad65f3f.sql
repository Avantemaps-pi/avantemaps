-- Bootstrap first admin user
-- This migration creates a function to assign admin role to a user
-- Usage: SELECT assign_admin_role('user-uuid-here');

CREATE OR REPLACE FUNCTION public.assign_admin_role(target_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert admin role for the target user
  INSERT INTO public.user_roles (user_id, role, created_by)
  VALUES (target_user_id, 'admin', auth.uid())
  ON CONFLICT (user_id, role) DO NOTHING;
  
  RAISE NOTICE 'Admin role assigned to user %', target_user_id;
END;
$$;

-- Grant execute permission to authenticated users (admin can assign other admins)
GRANT EXECUTE ON FUNCTION public.assign_admin_role(uuid) TO authenticated;

COMMENT ON FUNCTION public.assign_admin_role IS 'Assigns admin role to a user. Can only be called by existing admins or during initial setup.';
