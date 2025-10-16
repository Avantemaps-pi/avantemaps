-- Add server-side subscription enforcement for businesses table
-- This prevents users from bypassing subscription limits by modifying client-side storage

-- Drop the existing INSERT policy to replace it with subscription-aware policy
DROP POLICY IF EXISTS "Authenticated users can create businesses" ON public.businesses;

-- Create a function to get user's subscription tier from database
CREATE OR REPLACE FUNCTION public.get_user_subscription(user_id uuid)
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(subscription, 'individual')
  FROM public.users
  WHERE id = user_id;
$$;

-- Create a function to count user's businesses
CREATE OR REPLACE FUNCTION public.get_user_business_count(user_id uuid)
RETURNS integer
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::integer
  FROM public.businesses
  WHERE owner_id = user_id;
$$;

-- Create subscription-aware INSERT policy that enforces limits server-side
CREATE POLICY "Subscription limits business creation"
ON public.businesses
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = owner_id AND
  CASE 
    WHEN public.get_user_subscription(auth.uid()) = 'individual' 
    THEN public.get_user_business_count(auth.uid()) < 1
    WHEN public.get_user_subscription(auth.uid()) = 'small-business'
    THEN public.get_user_business_count(auth.uid()) < 5
    WHEN public.get_user_subscription(auth.uid()) = 'organization'
    THEN true
    ELSE public.get_user_business_count(auth.uid()) < 1
  END
);

-- Add comment explaining the security model
COMMENT ON POLICY "Subscription limits business creation" ON public.businesses IS 
'Server-side enforcement of subscription limits. Individual: 1 business, Small Business: 5 businesses, Organization: unlimited. Client-side checks are for UX only and must never be trusted for authorization.';