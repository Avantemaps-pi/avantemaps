-- Rework upsert_user_profile to avoid updating primary keys / breaking FK constraints.
-- This function now uses the authenticated user's id (auth.uid()) as the only row key
-- and derives pi_uid from JWT user_metadata (set by verify-pi-auth) or existing row.
-- It will NOT overwrite pi_uid/email if already present (prevents unique conflicts).

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
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Prefer pi_uid from auth JWT metadata (set by verify-pi-auth)
  v_pi_uid := NULLIF(auth.jwt() -> 'user_metadata' ->> 'pi_uid', '');

  -- Fallback to existing user row
  SELECT pi_uid, email
    INTO v_existing_pi_uid, v_existing_email
  FROM public.users
  WHERE id = auth.uid();

  v_pi_uid := COALESCE(v_pi_uid, v_existing_pi_uid);

  -- As a final fallback (should be rare), do NOT use p_user_id (client-controlled)
  -- Instead, keep pi_uid null and rely on verify-pi-auth to populate it.

  INSERT INTO public.users (id, pi_uid, username, email, subscription)
  VALUES (
    auth.uid(),
    v_pi_uid,
    p_username,
    COALESCE(v_existing_email, CASE WHEN v_pi_uid IS NOT NULL THEN v_pi_uid || '@pi.local' ELSE NULL END),
    COALESCE(p_subscription, 'individual')
  )
  ON CONFLICT (id) DO UPDATE
  SET
    username = EXCLUDED.username,
    -- Only fill pi_uid/email if missing; never overwrite to avoid unique conflicts
    pi_uid = COALESCE(public.users.pi_uid, EXCLUDED.pi_uid),
    email = COALESCE(public.users.email, EXCLUDED.email);

  -- Note: subscription is intentionally NOT updated here to avoid unauthorized changes
END;
$function$;