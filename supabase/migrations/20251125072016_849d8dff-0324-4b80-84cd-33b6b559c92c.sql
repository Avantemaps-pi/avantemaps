-- Add pi_uid column to public.users table
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS pi_uid TEXT UNIQUE;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_pi_uid ON public.users(pi_uid);

-- Add comment for documentation
COMMENT ON COLUMN public.users.pi_uid IS 'Pi Network user identifier (separate from Supabase UUID)';