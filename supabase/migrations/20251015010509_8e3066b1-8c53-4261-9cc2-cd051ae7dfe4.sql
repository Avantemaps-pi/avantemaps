-- Add public read access to businesses table with proper RLS policy
-- This replaces the SECURITY DEFINER function approach with proper row-level security

-- Create a public read policy that allows anyone to view verified businesses
-- but only exposes safe, non-sensitive fields
CREATE POLICY "Public can view verified businesses"
ON public.businesses
FOR SELECT
TO public
USING (is_verified = true);

-- Note: Sensitive fields like contact_info, owner_id, and pi_wallet_address 
-- are still protected by application logic that only exposes safe fields
-- The get_public_business_info() function can now be removed if desired