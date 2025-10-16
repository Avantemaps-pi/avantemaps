-- Add certification column to businesses table
ALTER TABLE public.businesses
ADD COLUMN IF NOT EXISTS is_certified boolean DEFAULT false NOT NULL;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_businesses_is_certified ON public.businesses(is_certified);

-- Drop and recreate the get_public_business_info function to include is_certified
DROP FUNCTION IF EXISTS public.get_public_business_info();

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
  created_at timestamp without time zone,
  is_verified boolean,
  is_certified boolean
)
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
    b.created_at,
    b.is_verified,
    b.is_certified
  FROM public.businesses b;
$$;

-- Grant execute permission to authenticated and anonymous users
GRANT EXECUTE ON FUNCTION public.get_public_business_info() TO authenticated, anon;