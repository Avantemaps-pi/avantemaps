CREATE OR REPLACE FUNCTION public.upsert_user_profile(p_user_id uuid, p_username text, p_subscription text)
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

  v_auth_email := auth.jwt() ->> 'email';
  v_pi_uid := NULLIF(auth.jwt() -> 'user_metadata' ->> 'pi_uid', '');

  SELECT pi_uid, email
    INTO v_existing_pi_uid, v_existing_email
  FROM public.users
  WHERE id = auth.uid();

  v_pi_uid := COALESCE(v_pi_uid, v_existing_pi_uid);

  -- Check if pi_uid is already claimed by another user; if so, don't try to set it
  IF v_pi_uid IS NOT NULL AND v_existing_pi_uid IS NULL THEN
    PERFORM 1 FROM public.users WHERE pi_uid = v_pi_uid AND id != auth.uid();
    IF FOUND THEN
      v_pi_uid := NULL; -- another user owns this pi_uid
    END IF;
  END IF;

  -- Check if email is already claimed by another user
  IF v_auth_email IS NOT NULL AND v_existing_email IS NULL THEN
    PERFORM 1 FROM public.users WHERE email = v_auth_email AND id != auth.uid();
    IF FOUND THEN
      v_auth_email := NULL; -- another user owns this email
    END IF;
  END IF;

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
    pi_uid = COALESCE(public.users.pi_uid, EXCLUDED.pi_uid),
    email = COALESCE(public.users.email, EXCLUDED.email);
END;
$function$;