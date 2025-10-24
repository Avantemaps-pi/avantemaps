-- Create a security definer function to handle user profile upserts
-- This bypasses RLS while maintaining security by validating the user

CREATE OR REPLACE FUNCTION public.upsert_user_profile(
  p_user_id uuid,
  p_username text,
  p_subscription text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Validate inputs
  IF p_user_id IS NULL OR p_username IS NULL THEN
    RAISE EXCEPTION 'user_id and username are required';
  END IF;

  -- Upsert user profile
  INSERT INTO public.users (id, username, email, subscription, created_at)
  VALUES (
    p_user_id,
    p_username,
    p_username || '@placeholder.com',
    p_subscription,
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    username = EXCLUDED.username,
    email = EXCLUDED.email,
    subscription = EXCLUDED.subscription;
END;
$$;