-- First, allow NULL emails
ALTER TABLE public.users ALTER COLUMN email DROP NOT NULL;

-- Then drop the existing unique constraint if it exists
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_email_key;

-- Create a partial unique index that only applies to non-null emails
CREATE UNIQUE INDEX IF NOT EXISTS users_email_unique ON public.users (email) WHERE email IS NOT NULL;

-- Update users with synthetic @pi.local emails that conflict to NULL
UPDATE public.users 
SET email = NULL 
WHERE email LIKE '%@pi.local' 
   OR email LIKE '%@placeholder.com';