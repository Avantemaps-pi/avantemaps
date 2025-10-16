-- Fix nullable user ID columns to prevent RLS bypass
-- First, ensure all existing rows have valid user IDs (if any exist)
-- Then make the columns NOT NULL

-- Make bookmarks.user_id NOT NULL
ALTER TABLE public.bookmarks 
ALTER COLUMN user_id SET NOT NULL;

-- Make businesses.owner_id NOT NULL
ALTER TABLE public.businesses 
ALTER COLUMN owner_id SET NOT NULL;

-- Make subscriptions.user_id NOT NULL
ALTER TABLE public.subscriptions 
ALTER COLUMN user_id SET NOT NULL;