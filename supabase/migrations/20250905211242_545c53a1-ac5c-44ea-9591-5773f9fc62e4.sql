-- SECURITY FIX: Remove public access to sensitive business data
-- This fixes the vulnerability where competitors could scrape contact info and wallet addresses

-- Drop the overly permissive public policy
DROP POLICY IF EXISTS "Public can view basic business info" ON public.businesses;

-- Create a restricted policy that only allows owners to see their full business data
CREATE POLICY "Business owners can view their own businesses" 
ON public.businesses 
FOR SELECT 
USING (auth.uid() = owner_id);

-- Create a secure view for public business information (alternative approach)
CREATE OR REPLACE VIEW public.public_business_view AS
SELECT 
  id,
  name,
  description,
  location,
  category,
  coordinates,
  business_types,
  keywords,
  created_at
FROM public.businesses;

-- Grant public access to the secure view
GRANT SELECT ON public.public_business_view TO anon, authenticated;

-- Update the get_public_business_info function to use the secure approach
CREATE OR REPLACE FUNCTION public.get_public_business_info()
RETURNS TABLE(id integer, name text, description text, location text, category text, coordinates text, business_types text[], keywords text[], created_at timestamp without time zone)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
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