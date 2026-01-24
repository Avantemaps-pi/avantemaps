-- Fix upsert_user_profile to handle unique constraint violations on pi_uid and email
-- The function now uses ON CONFLICT on both id and handles cases where pi_uid already exists

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
  v_existing_user_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Check if this pi_uid is already associated with a DIFFERENT Supabase user
  SELECT id INTO v_existing_user_id 
  FROM public.users 
  WHERE pi_uid = p_user_id::text AND id != auth.uid();

  IF v_existing_user_id IS NOT NULL THEN
    -- Pi UID exists for different user - update that record to use the new auth.uid()
    -- This handles the case where a Pi user re-authenticates and gets a new Supabase session
    UPDATE public.users
    SET id = auth.uid(),
        username = p_username,
        email = p_user_id::text || '@pi.local'
    WHERE pi_uid = p_user_id::text;
  ELSE
    -- Normal upsert: insert new or update existing by id
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
  END IF;
END;
$function$;