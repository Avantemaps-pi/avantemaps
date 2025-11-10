-- Add RLS policy to allow users to view their own businesses
CREATE POLICY "Users can view their own businesses"
ON public.businesses
FOR SELECT
USING (auth.uid() = owner_id);