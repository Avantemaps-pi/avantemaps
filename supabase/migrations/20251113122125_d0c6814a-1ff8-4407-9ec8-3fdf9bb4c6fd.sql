-- Drop the old function and recreate with correct column names
DROP FUNCTION IF EXISTS public.get_public_business_info();

CREATE FUNCTION public.get_public_business_info()
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
  is_certified boolean,
  street_address text,
  city text,
  state text,
  postal_code text,
  country text,
  latitude double precision,
  longitude double precision
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT 
    b.id,
    b.business_name AS name,
    b.business_description AS description,
    b.location,
    b.category,
    b.coordinates,
    b.business_types,
    b.keywords,
    b.created_at,
    b.is_verified,
    b.is_certified,
    b.street_address,
    b.city,
    b.state,
    b.zip_code AS postal_code,
    b.country,
    b.lat AS latitude,
    b.lng AS longitude
  FROM public.businesses b;
$function$;