
-- Fix get_public_business_info to properly filter businesses
-- Only return: verified/certified businesses OR user's own businesses
CREATE OR REPLACE FUNCTION public.get_public_business_info(user_uuid uuid DEFAULT NULL)
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
  longitude double precision,
  images text[],
  is_user_business boolean
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
    b.images,
    (user_uuid IS NOT NULL AND b.owner_id = user_uuid) as is_user_business
  FROM businesses b
  WHERE 
    -- Only show verified/certified businesses OR the user's own businesses
    b.is_verified = true 
    OR b.is_certified = true 
    OR (user_uuid IS NOT NULL AND b.owner_id = user_uuid);
END;
$$;
