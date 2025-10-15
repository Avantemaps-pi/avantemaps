-- Add verification columns to businesses table
ALTER TABLE public.businesses
ADD COLUMN IF NOT EXISTS is_verified boolean DEFAULT false NOT NULL,
ADD COLUMN IF NOT EXISTS verification_status text DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'rejected'));

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_businesses_is_verified ON public.businesses(is_verified);

-- Drop and recreate the get_public_business_info function to include is_verified
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
  is_verified boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
    b.is_verified
  FROM public.businesses b;
$function$;