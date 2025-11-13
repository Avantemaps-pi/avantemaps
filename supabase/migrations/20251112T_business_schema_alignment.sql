-- ============================================================================
-- MIGRATION: Align `public.businesses` schema with frontend + edge functions
-- Author: Thapelo / Avante Maps
-- Date: 2025-11-12
-- ============================================================================

BEGIN;

-- ✅ Ensure table exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'businesses') THEN
    RAISE EXCEPTION 'Table "public.businesses" does not exist. Please create it first.';
  END IF;
END $$;

-- ✅ Enable Row Level Security
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;

-- ✅ Ensure ID column autoincrements
ALTER TABLE public.businesses ALTER COLUMN id SET DEFAULT nextval('businesses_id_seq'::regclass);

-- ✅ Add missing lat/lng columns (for geolocation)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'businesses' AND column_name = 'lat'
  ) THEN
    ALTER TABLE public.businesses ADD COLUMN lat double precision;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'businesses' AND column_name = 'lng'
  ) THEN
    ALTER TABLE public.businesses ADD COLUMN lng double precision;
  END IF;
END $$;

-- ✅ Drop legacy PostGIS-style geo_location column (no longer used)
ALTER TABLE public.businesses DROP COLUMN IF EXISTS geo_location;

-- ✅ Rename columns to match TS + Edge Function fields
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'businesses' AND column_name = 'name'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'businesses' AND column_name = 'business_name'
  ) THEN
    ALTER TABLE public.businesses RENAME COLUMN name TO business_name;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'businesses' AND column_name = 'description'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'businesses' AND column_name = 'business_description'
  ) THEN
    ALTER TABLE public.businesses RENAME COLUMN description TO business_description;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'businesses' AND column_name = 'postal_code'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'businesses' AND column_name = 'zip_code'
  ) THEN
    ALTER TABLE public.businesses RENAME COLUMN postal_code TO zip_code;
  END IF;
END $$;

-- ✅ Set default values for reliability
ALTER TABLE public.businesses
  ALTER COLUMN is_verified SET DEFAULT false,
  ALTER COLUMN is_certified SET DEFAULT false,
  ALTER COLUMN verification_status SET DEFAULT 'pending';

-- ✅ Reapply standard business visibility RLS policies

DO $$
BEGIN
  -- Drop existing policies to avoid duplicates
  DROP POLICY IF EXISTS "Anyone can view verified businesses" ON public.businesses;
  DROP POLICY IF EXISTS "Owners can view their own businesses" ON public.businesses;
  DROP POLICY IF EXISTS "Owners can update their own businesses" ON public.businesses;
  DROP POLICY IF EXISTS "Prevent direct client inserts" ON public.businesses;

  -- Public view for verified businesses
  CREATE POLICY "Anyone can view verified businesses"
  ON public.businesses FOR SELECT
  USING (is_verified = TRUE);

  -- Owners can view their own records
  CREATE POLICY "Owners can view their own businesses"
  ON public.businesses FOR SELECT
  USING (auth.uid() = owner_id);

  -- Owners can update their own businesses
  CREATE POLICY "Owners can update their own businesses"
  ON public.businesses FOR UPDATE
  USING (auth.uid() = owner_id);

  -- Prevent direct client inserts (handled by Edge Function)
  CREATE POLICY "Prevent direct client inserts"
  ON public.businesses FOR INSERT
  WITH CHECK (false);
END $$;

COMMIT;

-- ✅ DONE: Schema now aligned with frontend & Edge Function
-- Columns now available:
--   business_name, business_description, business_types, contact_info,
--   street_address, city, state, zip_code, country,
--   lat, lng, pi_wallet_address, address_components, etc.
