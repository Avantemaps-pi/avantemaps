-- 🔒 CRITICAL SECURITY FIX: Users table RLS policies
-- Current policies use "true OR" logic that allows unrestricted access
-- This fix restricts access to user's own data only

-- Drop the dangerous overly-permissive policies
DROP POLICY IF EXISTS "Anon users can view profiles or their own data" ON users;
DROP POLICY IF EXISTS "Anon users can upsert or update their own data" ON users;

-- CREATE SECURE POLICIES: Users can only access their own data

-- SELECT: Users can only view their own profile
CREATE POLICY "Users can view their own profile"
  ON users FOR SELECT
  USING (auth.uid() = id);

-- UPDATE: Users can update their own profile but NOT subscription tier
-- Subscription changes must go through payment verification
CREATE POLICY "Users can update their own profile"
  ON users FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id 
    AND subscription = (SELECT subscription FROM users WHERE id = auth.uid())
  );

-- INSERT: Keep existing policy (already correct)
-- "Users can insert their own data" is properly scoped

-- DELETE: Keep existing policy (already correct)  
-- "Authenticated users can delete their own profiles" is properly scoped

-- 🔐 Secure the upsert_user_profile function to prevent subscription manipulation
-- This function should only be callable from verified Pi Network payment flow

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
  -- Insert new user or update existing (username only, not subscription)
  INSERT INTO users (id, username, email, subscription)
  VALUES (
    p_user_id, 
    p_username, 
    p_username || '@pi.local',
    COALESCE(p_subscription, 'individual')
  )
  ON CONFLICT (id) DO UPDATE
  SET 
    username = EXCLUDED.username,
    email = EXCLUDED.email;
    -- Note: subscription is NOT updated to prevent unauthorized changes
    -- Subscription updates must go through separate verified payment flow
END;
$$;