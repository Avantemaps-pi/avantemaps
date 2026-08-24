-- 1) Trigger-based pinning of privileged columns (SECURITY INVOKER so current_user reflects the real caller)
CREATE OR REPLACE FUNCTION public.protect_user_privileged_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_elevated boolean;
BEGIN
  v_elevated := current_user IN ('postgres', 'supabase_admin', 'service_role', 'supabase_auth_admin')
                OR coalesce(current_setting('request.jwt.claim.role', true), '') = 'service_role';

  IF v_elevated THEN
    RETURN NEW;
  END IF;

  IF NEW.subscription IS DISTINCT FROM OLD.subscription THEN
    RAISE EXCEPTION 'subscription cannot be changed directly; it is set by the server after payment validation';
  END IF;

  IF NEW.pi_uid IS DISTINCT FROM OLD.pi_uid THEN
    RAISE EXCEPTION 'pi_uid cannot be changed directly';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.protect_user_privileged_columns() FROM PUBLIC;

DROP TRIGGER IF EXISTS protect_user_privileged_columns_trigger ON public.users;
CREATE TRIGGER protect_user_privileged_columns_trigger
BEFORE UPDATE ON public.users
FOR EACH ROW
EXECUTE FUNCTION public.protect_user_privileged_columns();

-- 2) Simplify the UPDATE policy: no self-referential SELECT (was causing 42P17 infinite recursion)
DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;
CREATE POLICY "Users can update their own profile"
ON public.users
FOR UPDATE
TO authenticated
USING ((SELECT auth.uid()) = id)
WITH CHECK ((SELECT auth.uid()) = id);