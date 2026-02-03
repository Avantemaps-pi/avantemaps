-- Drop existing function first, then recreate with new return type
DROP FUNCTION IF EXISTS public.get_public_business_info(UUID);

CREATE OR REPLACE FUNCTION public.get_public_business_info(user_uuid UUID DEFAULT NULL)
RETURNS TABLE (
  id INTEGER,
  name TEXT,
  description TEXT,
  category TEXT,
  business_types TEXT[],
  keywords TEXT[],
  images TEXT[],
  location TEXT,
  street_address TEXT,
  city TEXT,
  state TEXT,
  postal_code TEXT,
  country TEXT,
  coordinates TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  is_verified BOOLEAN,
  is_certified BOOLEAN,
  verification_status TEXT,
  is_user_business BOOLEAN,
  created_at TIMESTAMP WITHOUT TIME ZONE,
  hours JSONB,
  contact_info JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    b.id,
    b.business_name AS name,
    b.business_description AS description,
    b.category,
    b.business_types,
    b.keywords,
    b.images,
    b.location,
    b.street_address,
    b.city,
    b.state,
    b.zip_code AS postal_code,
    b.country,
    b.coordinates,
    b.lat AS latitude,
    b.lng AS longitude,
    b.is_verified,
    b.is_certified,
    b.verification_status,
    CASE WHEN user_uuid IS NOT NULL AND b.owner_id = user_uuid THEN true ELSE false END AS is_user_business,
    b.created_at::timestamp without time zone AS created_at,
    b.hours,
    b.contact_info
  FROM businesses b
  ORDER BY b.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;