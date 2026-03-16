
CREATE OR REPLACE FUNCTION public.get_bookmarked_businesses(p_user_id uuid)
RETURNS TABLE (
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
  verification_status text,
  street_address text,
  city text,
  state text,
  postal_code text,
  country text,
  latitude double precision,
  longitude double precision,
  images text[],
  hours jsonb,
  contact_info jsonb
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
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
    b.verification_status,
    b.street_address,
    b.city,
    b.state,
    b.zip_code AS postal_code,
    b.country,
    b.lat AS latitude,
    b.lng AS longitude,
    b.images,
    b.hours,
    b.contact_info
  FROM bookmarks bk
  INNER JOIN businesses b ON b.id = bk.business_id
  WHERE bk.user_id = p_user_id
    AND (b.is_verified = true OR b.is_certified = true OR b.owner_id = p_user_id)
  ORDER BY bk.created_at DESC;
$$;
