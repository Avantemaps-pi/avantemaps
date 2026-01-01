-- Fix upsert_user_profile to use UID-based email (prevents 409 conflicts when username changes)
CREATE OR REPLACE FUNCTION public.upsert_user_profile(p_user_id uuid, p_username text, p_subscription text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Insert new user or update existing
  -- Email is now UID-based to avoid UNIQUE constraint violations when usernames change
  INSERT INTO users (id, username, email, subscription)
  VALUES (
    p_user_id, 
    p_username, 
    p_user_id::text || '@pi.local',
    COALESCE(p_subscription, 'individual')
  )
  ON CONFLICT (id) DO UPDATE
  SET 
    username = EXCLUDED.username,
    email = EXCLUDED.email;
    -- Note: subscription is NOT updated to prevent unauthorized changes
END;
$$;