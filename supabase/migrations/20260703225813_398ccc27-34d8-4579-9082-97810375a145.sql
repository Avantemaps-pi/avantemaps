
-- Fix: search RPCs must exclude inactive businesses
CREATE OR REPLACE FUNCTION public.search_businesses_by_location(search_city text DEFAULT NULL::text, search_state text DEFAULT NULL::text, search_postal_code text DEFAULT NULL::text, search_term text DEFAULT NULL::text, limit_count integer DEFAULT 50)
 RETURNS TABLE(id integer, name text, description text, street_address text, city text, state text, postal_code text, latitude numeric, longitude numeric, category text, business_types text[], is_verified boolean, is_certified boolean, relevance real)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    b.id, b.name, b.description, b.street_address, b.city, b.state, b.postal_code,
    ST_Y(b.geo_location::geometry) as latitude,
    ST_X(b.geo_location::geometry) as longitude,
    b.category, b.business_types, b.is_verified, b.is_certified,
    CASE WHEN search_term IS NOT NULL AND b.search_vector IS NOT NULL
      THEN ts_rank(b.search_vector, plainto_tsquery('english', search_term))
      ELSE 0 END as relevance
  FROM public.businesses b
  WHERE b.is_verified = true
    AND b.is_active = true
    AND b.geo_location IS NOT NULL
    AND (search_city IS NULL OR LOWER(b.city) = LOWER(search_city))
    AND (search_state IS NULL OR LOWER(b.state) = LOWER(search_state))
    AND (search_postal_code IS NULL OR b.postal_code = search_postal_code)
    AND (search_term IS NULL OR b.search_vector @@ plainto_tsquery('english', search_term))
  ORDER BY
    CASE WHEN search_term IS NOT NULL AND b.search_vector IS NOT NULL
      THEN ts_rank(b.search_vector, plainto_tsquery('english', search_term))
      ELSE 0 END DESC
  LIMIT limit_count;
END;
$function$;

CREATE OR REPLACE FUNCTION public.search_businesses_nearby(lat numeric, lng numeric, radius_meters integer DEFAULT 5000, search_term text DEFAULT NULL::text, limit_count integer DEFAULT 50)
 RETURNS TABLE(id integer, name text, description text, street_address text, city text, state text, postal_code text, latitude numeric, longitude numeric, distance_meters numeric, category text, business_types text[], is_verified boolean, is_certified boolean, relevance real)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  search_point geography;
BEGIN
  search_point := ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography;
  RETURN QUERY
  SELECT
    b.id, b.name, b.description, b.street_address, b.city, b.state, b.postal_code,
    ST_Y(b.geo_location::geometry) as latitude,
    ST_X(b.geo_location::geometry) as longitude,
    ST_Distance(b.geo_location, search_point) as distance_meters,
    b.category, b.business_types, b.is_verified, b.is_certified,
    CASE WHEN search_term IS NOT NULL AND b.search_vector IS NOT NULL
      THEN ts_rank(b.search_vector, plainto_tsquery('english', search_term))
      ELSE 0 END as relevance
  FROM public.businesses b
  WHERE b.is_verified = true
    AND b.is_active = true
    AND b.geo_location IS NOT NULL
    AND ST_DWithin(b.geo_location, search_point, radius_meters)
    AND (search_term IS NULL OR b.search_vector @@ plainto_tsquery('english', search_term))
  ORDER BY
    (CASE WHEN search_term IS NOT NULL THEN ts_rank(b.search_vector, plainto_tsquery('english', search_term)) ELSE 0 END) DESC,
    ST_Distance(b.geo_location, search_point) ASC
  LIMIT limit_count;
END;
$function$;

-- Fix: prevent owners from self-granting privileged flags
CREATE OR REPLACE FUNCTION public.protect_business_privileged_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_privileged boolean := false;
BEGIN
  -- Service role bypasses via elevated JWT role
  IF current_setting('request.jwt.claim.role', true) = 'service_role' THEN
    RETURN NEW;
  END IF;

  IF auth.uid() IS NOT NULL AND public.has_role(auth.uid(), 'admin'::app_role) THEN
    is_privileged := true;
  END IF;

  IF is_privileged THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.is_verified := false;
    NEW.is_certified := false;
    NEW.verification_status := NULL;
    NEW.is_active := COALESCE(NEW.is_active, true);
    RETURN NEW;
  END IF;

  -- UPDATE: preserve prior values on protected columns
  NEW.is_verified := OLD.is_verified;
  NEW.is_certified := OLD.is_certified;
  NEW.verification_status := OLD.verification_status;
  NEW.is_active := OLD.is_active;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_business_privileged_columns ON public.businesses;
CREATE TRIGGER trg_protect_business_privileged_columns
BEFORE INSERT OR UPDATE ON public.businesses
FOR EACH ROW EXECUTE FUNCTION public.protect_business_privileged_columns();
