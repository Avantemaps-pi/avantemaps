
CREATE OR REPLACE FUNCTION public.get_bookmarked_businesses(p_user_id uuid)
 RETURNS TABLE(id integer, name text, description text, location text, category text, coordinates text, business_types text[], keywords text[], created_at timestamp without time zone, is_verified boolean, is_certified boolean, verification_status text, street_address text, city text, state text, postal_code text, country text, latitude double precision, longitude double precision, images text[], hours jsonb, contact_info jsonb)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> p_user_id THEN
    RAISE EXCEPTION 'Access denied';
  END IF;
  RETURN QUERY
  SELECT b.id, b.business_name, b.business_description, b.location, b.category, b.coordinates,
    b.business_types, b.keywords, b.created_at, b.is_verified, b.is_certified, b.verification_status,
    b.street_address, b.city, b.state, b.zip_code, b.country, b.lat, b.lng, b.images, b.hours, b.contact_info
  FROM bookmarks bk
  INNER JOIN businesses b ON b.id = bk.business_id
  WHERE bk.user_id = p_user_id
    AND (b.is_verified = true OR b.is_certified = true OR b.owner_id = p_user_id)
  ORDER BY bk.created_at DESC;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_user_recommended_businesses(p_user_id uuid, p_limit integer DEFAULT 10)
 RETURNS TABLE(business_id integer, search_count bigint, last_searched_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> p_user_id THEN
    RAISE EXCEPTION 'Access denied';
  END IF;
  RETURN QUERY
  SELECT us.business_id, COUNT(*)::bigint, MAX(us.searched_at)
  FROM public.user_searches us
  WHERE us.user_id = p_user_id AND us.business_id IS NOT NULL
  GROUP BY us.business_id
  ORDER BY COUNT(*) DESC, MAX(us.searched_at) DESC
  LIMIT p_limit;
END;
$function$;
