-- Fix: Rework upsert_user_profile to not generate synthetic emails that could conflict.
-- Instead, allow email to be NULL and only set it if explicitly provided or from auth.email().

CREATE OR REPLACE FUNCTION public.upsert_user_profile(
  p_user_id uuid,
  p_username text,
  p_subscription text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_pi_uid text;
  v_existing_pi_uid text;
  v_existing_email text;
  v_auth_email text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Get email from auth if available
  v_auth_email := auth.jwt() ->> 'email';

  -- Prefer pi_uid from auth JWT metadata (set by verify-pi-auth)
  v_pi_uid := NULLIF(auth.jwt() -> 'user_metadata' ->> 'pi_uid', '');

  -- Fallback to existing user row
  SELECT pi_uid, email
    INTO v_existing_pi_uid, v_existing_email
  FROM public.users
  WHERE id = auth.uid();

  v_pi_uid := COALESCE(v_pi_uid, v_existing_pi_uid);

  -- Use existing email if available, then auth email, but do NOT generate synthetic emails
  INSERT INTO public.users (id, pi_uid, username, email, subscription)
  VALUES (
    auth.uid(),
    v_pi_uid,
    p_username,
    COALESCE(v_existing_email, NULLIF(v_auth_email, '')),
    COALESCE(p_subscription, 'individual')
  )
  ON CONFLICT (id) DO UPDATE
  SET
    username = COALESCE(EXCLUDED.username, public.users.username),
    -- Only fill pi_uid/email if missing; never overwrite to avoid unique conflicts
    pi_uid = COALESCE(public.users.pi_uid, EXCLUDED.pi_uid),
    email = COALESCE(public.users.email, EXCLUDED.email);

  -- Note: subscription is intentionally NOT updated here to avoid unauthorized changes
END;
$function$;