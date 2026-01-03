-- Drop and recreate the function to include verification_status
DROP FUNCTION IF EXISTS get_public_business_info(uuid);

CREATE OR REPLACE FUNCTION get_public_business_info(user_uuid uuid DEFAULT NULL)
RETURNS TABLE (
  id integer,
  name text,
  description text,
  category text,
  business_types text[],
  keywords text[],
  images text[],
  location text,
  street_address text,
  city text,
  state text,
  postal_code text,
  country text,
  coordinates text,
  latitude double precision,
  longitude double precision,
  is_verified boolean,
  is_certified boolean,
  verification_status text,
  is_user_business boolean,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
    b.created_at
  FROM businesses b
  ORDER BY b.created_at DESC;
END;
$$;