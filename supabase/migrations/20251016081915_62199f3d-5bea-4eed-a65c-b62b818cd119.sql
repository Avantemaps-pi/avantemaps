-- Security fix: Make storage buckets private and add RLS policies
-- This prevents unrestricted public access to user-uploaded content

-- Step 1: Make existing buckets private
UPDATE storage.buckets 
SET public = false 
WHERE name IN ('user-data', 'business-images');

-- Step 2: Add RLS policies for user-data bucket
-- Users can only upload to their own folder
CREATE POLICY "Users can upload their own files to user-data"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'user-data' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Users can only view their own files
CREATE POLICY "Users can view their own files in user-data"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'user-data' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Users can update their own files
CREATE POLICY "Users can update their own files in user-data"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'user-data' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Users can delete their own files
CREATE POLICY "Users can delete their own files in user-data"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'user-data' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Step 3: Add RLS policies for business-images bucket
-- Business owners can upload images to their business folders
CREATE POLICY "Business owners can upload images"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'business-images' AND
    EXISTS (
      SELECT 1 FROM businesses 
      WHERE owner_id = auth.uid()
      AND id::text = (storage.foldername(name))[1]
    )
  );

-- Public can view images of verified businesses only
CREATE POLICY "Public can view verified business images"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'business-images' AND
    EXISTS (
      SELECT 1 FROM businesses 
      WHERE is_verified = true
      AND id::text = (storage.foldername(name))[1]
    )
  );

-- Business owners can view their own business images (even if not verified)
CREATE POLICY "Owners can view their own business images"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'business-images' AND
    EXISTS (
      SELECT 1 FROM businesses 
      WHERE owner_id = auth.uid()
      AND id::text = (storage.foldername(name))[1]
    )
  );

-- Business owners can update their own images
CREATE POLICY "Owners can update their own business images"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'business-images' AND
    EXISTS (
      SELECT 1 FROM businesses 
      WHERE owner_id = auth.uid()
      AND id::text = (storage.foldername(name))[1]
    )
  );

-- Business owners can delete their own images
CREATE POLICY "Owners can delete their own business images"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'business-images' AND
    EXISTS (
      SELECT 1 FROM businesses 
      WHERE owner_id = auth.uid()
      AND id::text = (storage.foldername(name))[1]
    )
  );