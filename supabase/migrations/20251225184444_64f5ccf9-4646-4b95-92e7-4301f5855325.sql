-- Drop and recreate the function with images column
DROP FUNCTION IF EXISTS public.get_public_business_info();

CREATE FUNCTION public.get_public_business_info()
RETURNS TABLE (
  id integer,
  name text,
  description text,
  location text,
  category text,
  coordinates text,
  business_types text[],
  keywords text[],
  created_at timestamptz,
  is_verified boolean,
  is_certified boolean,
  street_address text,
  city text,
  state text,
  postal_code text,
  country text,
  latitude double precision,
  longitude double precision,
  images text[]
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    b.id,
    b.business_name as name,
    b.business_description as description,
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
    b.zip_code as postal_code,
    b.country,
    b.lat as latitude,
    b.lng as longitude,
    b.images
  FROM businesses b;
END;
$$;