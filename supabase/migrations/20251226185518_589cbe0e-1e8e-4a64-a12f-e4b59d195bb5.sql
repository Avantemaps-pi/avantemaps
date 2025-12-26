-- Fix broken storage RLS policies for business-images bucket
-- The issue: policies were using storage.foldername(businesses.business_name) instead of storage.foldername(name)

-- Drop all existing broken policies for business-images bucket
DROP POLICY IF EXISTS "Business owners can upload images" ON storage.objects;
DROP POLICY IF EXISTS "Owners can view their own business images" ON storage.objects;
DROP POLICY IF EXISTS "Business owners can update their images" ON storage.objects;
DROP POLICY IF EXISTS "Business owners can delete their images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view business images" ON storage.objects;
DROP POLICY IF EXISTS "Public can view business images" ON storage.objects;

-- Create corrected INSERT policy: Allow business owners to upload images to their business folder
-- The folder structure is: business-images/{business_id}/filename
CREATE POLICY "Business owners can upload images" ON storage.objects
FOR INSERT TO public
WITH CHECK (
  bucket_id = 'business-images' AND
  auth.uid() IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM public.businesses
    WHERE businesses.owner_id = auth.uid()
    AND businesses.id::text = (storage.foldername(name))[1]
  )
);

-- Create corrected SELECT policy: Allow public to view all business images
CREATE POLICY "Public can view business images" ON storage.objects
FOR SELECT TO public
USING (bucket_id = 'business-images');

-- Create corrected UPDATE policy: Allow business owners to update their images
CREATE POLICY "Business owners can update their images" ON storage.objects
FOR UPDATE TO public
USING (
  bucket_id = 'business-images' AND
  auth.uid() IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM public.businesses
    WHERE businesses.owner_id = auth.uid()
    AND businesses.id::text = (storage.foldername(name))[1]
  )
)
WITH CHECK (
  bucket_id = 'business-images' AND
  auth.uid() IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM public.businesses
    WHERE businesses.owner_id = auth.uid()
    AND businesses.id::text = (storage.foldername(name))[1]
  )
);

-- Create corrected DELETE policy: Allow business owners to delete their images
CREATE POLICY "Business owners can delete their images" ON storage.objects
FOR DELETE TO public
USING (
  bucket_id = 'business-images' AND
  auth.uid() IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM public.businesses
    WHERE businesses.owner_id = auth.uid()
    AND businesses.id::text = (storage.foldername(name))[1]
  )
);