-- Fix upsert_user_profile to always write to the currently authenticated Supabase user id
-- and treat p_user_id as the Pi UID for stable UID-based emails.

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
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Insert new user or update existing.
  -- id is ALWAYS the current authenticated Supabase user id (auth.uid()).
  -- email is derived from the Pi UID to avoid UNIQUE constraint violations when usernames change.
  INSERT INTO public.users (id, pi_uid, username, email, subscription)
  VALUES (
    auth.uid(),
    p_user_id::text,
    p_username,
    p_user_id::text || '@pi.local',
    COALESCE(p_subscription, 'individual')
  )
  ON CONFLICT (id) DO UPDATE
  SET
    pi_uid = EXCLUDED.pi_uid,
    username = EXCLUDED.username,
    email = EXCLUDED.email;
    -- Note: subscription is NOT updated to prevent unauthorized changes
END;
$function$;