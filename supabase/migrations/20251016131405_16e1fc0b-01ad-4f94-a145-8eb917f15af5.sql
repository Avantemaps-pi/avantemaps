-- Phase 1: Enable PostGIS and add spatial data support
CREATE EXTENSION IF NOT EXISTS postgis;

-- Add native geography column for better spatial queries
ALTER TABLE public.businesses 
ADD COLUMN IF NOT EXISTS geo_location geography(POINT, 4326);

-- Populate geo_location from existing coordinates (only for valid JSON)
UPDATE public.businesses 
SET geo_location = ST_SetSRID(
  ST_MakePoint(
    (coordinates::jsonb->>'lng')::numeric,
    (coordinates::jsonb->>'lat')::numeric
  ),
  4326
)::geography
WHERE coordinates IS NOT NULL 
  AND coordinates != '' 
  AND coordinates::jsonb ? 'lng' 
  AND coordinates::jsonb ? 'lat';

-- Create spatial index for fast proximity queries
CREATE INDEX IF NOT EXISTS idx_businesses_geo_location 
ON public.businesses USING GIST (geo_location);

-- Phase 2: Add structured address components
ALTER TABLE public.businesses
ADD COLUMN IF NOT EXISTS address_components JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS street_address TEXT,
ADD COLUMN IF NOT EXISTS city TEXT,
ADD COLUMN IF NOT EXISTS state TEXT,
ADD COLUMN IF NOT EXISTS postal_code TEXT,
ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'US';

-- Populate street_address from existing location field temporarily
UPDATE public.businesses
SET street_address = location
WHERE location IS NOT NULL AND street_address IS NULL;

-- Create indexes for common location searches
CREATE INDEX IF NOT EXISTS idx_businesses_city ON public.businesses(city);
CREATE INDEX IF NOT EXISTS idx_businesses_state ON public.businesses(state);
CREATE INDEX IF NOT EXISTS idx_businesses_postal_code ON public.businesses(postal_code);
CREATE INDEX IF NOT EXISTS idx_businesses_city_state ON public.businesses(city, state);

-- Phase 3: Add full-text search support
ALTER TABLE public.businesses
ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- Create function to update search vector
CREATE OR REPLACE FUNCTION public.businesses_search_vector_update()
RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', COALESCE(NEW.name, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.description, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(NEW.street_address, '')), 'C') ||
    setweight(to_tsvector('english', COALESCE(NEW.city, '')), 'C') ||
    setweight(to_tsvector('english', COALESCE(NEW.state, '')), 'C') ||
    setweight(to_tsvector('english', COALESCE(array_to_string(NEW.keywords, ' '), '')), 'B');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for automatic search vector updates
DROP TRIGGER IF EXISTS businesses_search_vector_trigger ON public.businesses;
CREATE TRIGGER businesses_search_vector_trigger
BEFORE INSERT OR UPDATE ON public.businesses
FOR EACH ROW
EXECUTE FUNCTION public.businesses_search_vector_update();

-- Populate search vectors for existing records
UPDATE public.businesses SET search_vector = 
  setweight(to_tsvector('english', COALESCE(name, '')), 'A') ||
  setweight(to_tsvector('english', COALESCE(description, '')), 'B') ||
  setweight(to_tsvector('english', COALESCE(street_address, '')), 'C') ||
  setweight(to_tsvector('english', COALESCE(city, '')), 'C') ||
  setweight(to_tsvector('english', COALESCE(state, '')), 'C') ||
  setweight(to_tsvector('english', COALESCE(array_to_string(keywords, ' '), '')), 'B');

-- Create GIN index for fast full-text search
CREATE INDEX IF NOT EXISTS idx_businesses_search_vector 
ON public.businesses USING GIN(search_vector);

-- Phase 4: Create enhanced search functions

-- Proximity search function
CREATE OR REPLACE FUNCTION public.search_businesses_nearby(
  lat NUMERIC,
  lng NUMERIC,
  radius_meters INTEGER DEFAULT 5000,
  search_term TEXT DEFAULT NULL,
  limit_count INTEGER DEFAULT 50
)
RETURNS TABLE(
  id INTEGER,
  name TEXT,
  description TEXT,
  street_address TEXT,
  city TEXT,
  state TEXT,
  postal_code TEXT,
  latitude NUMERIC,
  longitude NUMERIC,
  distance_meters NUMERIC,
  category TEXT,
  business_types TEXT[],
  is_verified BOOLEAN,
  is_certified BOOLEAN,
  relevance REAL
) 
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  search_point geography;
BEGIN
  search_point := ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography;
  
  RETURN QUERY
  SELECT 
    b.id,
    b.name,
    b.description,
    b.street_address,
    b.city,
    b.state,
    b.postal_code,
    ST_Y(b.geo_location::geometry) as latitude,
    ST_X(b.geo_location::geometry) as longitude,
    ST_Distance(b.geo_location, search_point) as distance_meters,
    b.category,
    b.business_types,
    b.is_verified,
    b.is_certified,
    CASE 
      WHEN search_term IS NOT NULL AND b.search_vector IS NOT NULL
      THEN ts_rank(b.search_vector, plainto_tsquery('english', search_term))
      ELSE 0
    END as relevance
  FROM public.businesses b
  WHERE 
    b.is_verified = true
    AND b.geo_location IS NOT NULL
    AND ST_DWithin(b.geo_location, search_point, radius_meters)
    AND (
      search_term IS NULL 
      OR b.search_vector @@ plainto_tsquery('english', search_term)
    )
  ORDER BY 
    (CASE WHEN search_term IS NOT NULL THEN ts_rank(b.search_vector, plainto_tsquery('english', search_term)) ELSE 0 END) DESC,
    ST_Distance(b.geo_location, search_point) ASC
  LIMIT limit_count;
END;
$$;

-- City/Region search function
CREATE OR REPLACE FUNCTION public.search_businesses_by_location(
  search_city TEXT DEFAULT NULL,
  search_state TEXT DEFAULT NULL,
  search_postal_code TEXT DEFAULT NULL,
  search_term TEXT DEFAULT NULL,
  limit_count INTEGER DEFAULT 50
)
RETURNS TABLE(
  id INTEGER,
  name TEXT,
  description TEXT,
  street_address TEXT,
  city TEXT,
  state TEXT,
  postal_code TEXT,
  latitude NUMERIC,
  longitude NUMERIC,
  category TEXT,
  business_types TEXT[],
  is_verified BOOLEAN,
  is_certified BOOLEAN,
  relevance REAL
) 
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    b.id,
    b.name,
    b.description,
    b.street_address,
    b.city,
    b.state,
    b.postal_code,
    ST_Y(b.geo_location::geometry) as latitude,
    ST_X(b.geo_location::geometry) as longitude,
    b.category,
    b.business_types,
    b.is_verified,
    b.is_certified,
    CASE 
      WHEN search_term IS NOT NULL AND b.search_vector IS NOT NULL
      THEN ts_rank(b.search_vector, plainto_tsquery('english', search_term))
      ELSE 0
    END as relevance
  FROM public.businesses b
  WHERE 
    b.is_verified = true
    AND b.geo_location IS NOT NULL
    AND (search_city IS NULL OR LOWER(b.city) = LOWER(search_city))
    AND (search_state IS NULL OR LOWER(b.state) = LOWER(search_state))
    AND (search_postal_code IS NULL OR b.postal_code = search_postal_code)
    AND (
      search_term IS NULL 
      OR b.search_vector @@ plainto_tsquery('english', search_term)
    )
  ORDER BY 
    CASE 
      WHEN search_term IS NOT NULL AND b.search_vector IS NOT NULL
      THEN ts_rank(b.search_vector, plainto_tsquery('english', search_term))
      ELSE 0
    END DESC
  LIMIT limit_count;
END;
$$;

-- Phase 5: Update get_public_business_info to include new fields
DROP FUNCTION IF EXISTS public.get_public_business_info();

CREATE OR REPLACE FUNCTION public.get_public_business_info()
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
  latitude numeric,
  longitude numeric
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $function$
  SELECT 
    b.id,
    b.name,
    b.description,
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
    b.postal_code,
    b.country,
    ST_Y(b.geo_location::geometry) as latitude,
    ST_X(b.geo_location::geometry) as longitude
  FROM public.businesses b;
$function$;

-- Phase 6: Backward compatibility - sync coordinates and geo_location
CREATE OR REPLACE FUNCTION public.sync_coordinates_to_geo()
RETURNS trigger AS $$
BEGIN
  -- If geo_location is set, update coordinates for backward compatibility
  IF NEW.geo_location IS NOT NULL THEN
    NEW.coordinates := json_build_object(
      'lat', ST_Y(NEW.geo_location::geometry),
      'lng', ST_X(NEW.geo_location::geometry)
    )::text;
  END IF;
  
  -- If coordinates is set but geo_location is not, update geo_location
  IF NEW.coordinates IS NOT NULL AND NEW.coordinates != '' AND NEW.geo_location IS NULL THEN
    BEGIN
      NEW.geo_location := ST_SetSRID(
        ST_MakePoint(
          (NEW.coordinates::jsonb->>'lng')::numeric,
          (NEW.coordinates::jsonb->>'lat')::numeric
        ),
        4326
      )::geography;
    EXCEPTION WHEN OTHERS THEN
      -- If coordinates parsing fails, log and continue
      RAISE WARNING 'Failed to parse coordinates: %', NEW.coordinates;
    END;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS sync_coordinates_trigger ON public.businesses;
CREATE TRIGGER sync_coordinates_trigger
BEFORE INSERT OR UPDATE ON public.businesses
FOR EACH ROW
EXECUTE FUNCTION public.sync_coordinates_to_geo();