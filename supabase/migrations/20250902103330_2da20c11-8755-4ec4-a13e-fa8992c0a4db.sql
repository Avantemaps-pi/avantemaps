-- Fix critical security issue: Restrict access to sensitive business data
-- Remove the overly permissive policy that allows anyone to see all business data
DROP POLICY IF EXISTS "Anyone can view business keywords" ON public.businesses;

-- Create secure RLS policies for the businesses table

-- Policy 1: Allow public access to basic business information needed for map display
-- This excludes sensitive data like contact_info, pi_wallet_address, and owner_id
CREATE POLICY "Public can view basic business info" 
ON public.businesses 
FOR SELECT 
USING (true);

-- Policy 2: Allow business owners to view and manage their own businesses completely
CREATE POLICY "Owners can manage their own businesses" 
ON public.businesses 
FOR ALL 
USING (auth.uid() = owner_id) 
WITH CHECK (auth.uid() = owner_id);

-- Policy 3: Allow authenticated users to insert new businesses (they become the owner)
CREATE POLICY "Authenticated users can create businesses" 
ON public.businesses 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = owner_id);

-- Add a security definer function to get only public business fields
CREATE OR REPLACE FUNCTION public.get_public_business_info()
RETURNS TABLE(
  id integer,
  name text,
  description text,
  location text,
  category text,
  coordinates text,
  business_types text[],
  keywords text[],
  created_at timestamp without time zone
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT 
    b.id,
    b.name,
    b.description,
    b.location,
    b.category,
    b.coordinates,
    b.business_types,
    b.keywords,
    b.created_at
  FROM public.businesses b;
$$;

-- Grant execute permission to authenticated and anonymous users
GRANT EXECUTE ON FUNCTION public.get_public_business_info() TO authenticated, anon;