
-- Add is_active filter to public business functions
CREATE OR REPLACE FUNCTION public.get_public_business_info(user_uuid uuid DEFAULT NULL::uuid)
 RETURNS TABLE(id integer, name text, description text, category text, business_types text[], keywords text[], images text[], location text, street_address text, city text, state text, postal_code text, country text, coordinates text, latitude double precision, longitude double precision, is_verified boolean, is_certified boolean, verification_status text, is_user_business boolean, created_at timestamp without time zone, hours jsonb, contact_info jsonb)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    b.id, b.business_name, b.business_description, b.category, b.business_types, b.keywords, b.images,
    b.location, b.street_address, b.city, b.state, b.zip_code, b.country, b.coordinates,
    b.lat, b.lng, b.is_verified, b.is_certified, b.verification_status,
    CASE WHEN user_uuid IS NOT NULL AND b.owner_id = user_uuid THEN true ELSE false END,
    b.created_at::timestamp without time zone, b.hours, b.contact_info
  FROM businesses b
  WHERE b.is_active = true
  ORDER BY b.created_at DESC;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_public_business_detail(business_id integer)
 RETURNS TABLE(id integer, name text, description text, category text, business_types text[], keywords text[], images text[], location text, street_address text, city text, state text, postal_code text, country text, coordinates text, latitude double precision, longitude double precision, is_verified boolean, is_certified boolean, verification_status text, hours jsonb, contact_info jsonb, rating numeric, total_reviews bigint, created_at timestamp without time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    b.id, b.business_name, b.business_description, b.category, b.business_types, b.keywords, b.images,
    b.location, b.street_address, b.city, b.state, b.zip_code, b.country, b.coordinates,
    b.lat, b.lng, b.is_verified, b.is_certified, b.verification_status, b.hours, b.contact_info,
    COALESCE(avg_reviews.avg_rating, 0)::numeric,
    COALESCE(avg_reviews.review_count, 0)::bigint,
    b.created_at
  FROM businesses b
  LEFT JOIN LATERAL (
    SELECT AVG(r.rating)::numeric AS avg_rating, COUNT(r.id)::bigint AS review_count
    FROM reviews r WHERE r.business_id = b.id
  ) avg_reviews ON true
  WHERE b.id = business_id AND b.is_active = true;
END;
$function$;

-- Restrict subscription RPC to service_role only
REVOKE EXECUTE ON FUNCTION public.handle_subscription_after_payment(uuid, text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.handle_subscription_after_payment(uuid, text, text, text) TO service_role;
