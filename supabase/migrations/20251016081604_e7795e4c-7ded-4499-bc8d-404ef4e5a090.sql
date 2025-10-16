-- Security fix: Add access control to assign_admin_role function
-- Only existing admins should be able to assign admin roles

CREATE OR REPLACE FUNCTION public.assign_admin_role(target_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify caller is admin before allowing role assignment
  IF NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied: Only administrators can assign admin roles';
  END IF;
  
  -- Insert admin role for the target user
  INSERT INTO public.user_roles (user_id, role, created_by)
  VALUES (target_user_id, 'admin', auth.uid())
  ON CONFLICT (user_id, role) DO NOTHING;
  
  RAISE NOTICE 'Admin role assigned to user % by %', target_user_id, auth.uid();
END;
$$;

-- Security fix: Improve get_user_subscription to only allow querying own subscription or by admins
CREATE OR REPLACE FUNCTION public.get_user_subscription(user_id uuid)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Allow users to query their own subscription or admins to query any
  IF auth.uid() = user_id OR has_role(auth.uid(), 'admin') THEN
    RETURN COALESCE(
      (SELECT subscription FROM public.users WHERE id = user_id),
      'individual'
    );
  ELSE
    RAISE EXCEPTION 'Access denied: Cannot query other users subscription';
  END IF;
END;
$$;

-- Security fix: Improve get_user_business_count to only allow querying own count or by admins
CREATE OR REPLACE FUNCTION public.get_user_business_count(user_id uuid)
RETURNS integer
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Allow users to query their own count or admins to query any
  IF auth.uid() = user_id OR has_role(auth.uid(), 'admin') THEN
    RETURN (SELECT COUNT(*)::integer FROM public.businesses WHERE owner_id = user_id);
  ELSE
    RAISE EXCEPTION 'Access denied: Cannot query other users business count';
  END IF;
END;
$$;