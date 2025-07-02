
-- Create a storage bucket for user data
INSERT INTO storage.buckets (id, name, public)
VALUES ('user-data', 'user-data', true);

-- Create RLS policies for the user-data bucket
CREATE POLICY "Users can upload their own data" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'user-data' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their own data" ON storage.objects
FOR SELECT USING (bucket_id = 'user-data' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own data" ON storage.objects
FOR UPDATE USING (bucket_id = 'user-data' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own data" ON storage.objects
FOR DELETE USING (bucket_id = 'user-data' AND auth.uid()::text = (storage.foldername(name))[1]);
