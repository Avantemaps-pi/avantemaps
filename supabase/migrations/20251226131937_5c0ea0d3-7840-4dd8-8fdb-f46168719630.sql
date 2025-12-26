-- Make the business-images bucket public
UPDATE storage.buckets 
SET public = true 
WHERE id = 'business-images';

-- Drop the broken storage RLS policy if it exists
DROP POLICY IF EXISTS "Public can view verified business images" ON storage.objects;

-- Create a simple public read policy for business images
CREATE POLICY "Anyone can view business images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'business-images');