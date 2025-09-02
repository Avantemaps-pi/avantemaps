-- Fix security warning: Set immutable search_path for the function
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