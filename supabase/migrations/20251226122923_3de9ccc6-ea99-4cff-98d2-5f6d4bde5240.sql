-- Drop the current overly permissive SELECT policy
DROP POLICY IF EXISTS "Anyone can view verified businesses" ON businesses;

-- Policy for public/anonymous viewing (map, recommendations, etc.)
-- This allows anyone to see verified OR certified businesses for public display
CREATE POLICY "Public can view verified or certified businesses"
ON businesses FOR SELECT
TO anon
USING (is_verified = true OR is_certified = true);

-- Policy for authenticated owners to see ALL their own businesses (including unverified)
-- This is what the Registered Business page should use
CREATE POLICY "Owners can view all their own businesses"
ON businesses FOR SELECT
TO authenticated
USING (owner_id = auth.uid());

-- Policy for authenticated users to also see public verified businesses (for map/search while logged in)
CREATE POLICY "Authenticated users can view verified businesses"
ON businesses FOR SELECT
TO authenticated
USING (is_verified = true OR is_certified = true);