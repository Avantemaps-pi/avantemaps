CREATE OR REPLACE FUNCTION get_public_business_detail(business_id integer)
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
  hours jsonb,
  contact_info jsonb,
  rating numeric,
  total_reviews bigint,
  created_at timestamp without time zone
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
    b.hours,
    b.contact_info,
    COALESCE(avg_reviews.avg_rating, 0)::numeric AS rating,
    COALESCE(avg_reviews.review_count, 0)::bigint AS total_reviews,
    b.created_at
  FROM businesses b
  LEFT JOIN LATERAL (
    SELECT
      AVG(r.rating)::numeric AS avg_rating,
      COUNT(r.id)::bigint AS review_count
    FROM reviews r
    WHERE r.business_id = b.id
  ) avg_reviews ON true
  WHERE b.id = business_id;
END;
$$;