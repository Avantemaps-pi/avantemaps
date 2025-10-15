-- Fix user_id type inconsistency in payments table
-- Change from TEXT to UUID to match other tables and prevent type casting errors

-- Step 1: Drop existing RLS policies that depend on the user_id column
DROP POLICY IF EXISTS "Users can create their own payments" ON public.payments;
DROP POLICY IF EXISTS "Users can update their own payments" ON public.payments;
DROP POLICY IF EXISTS "Users can view their own payments" ON public.payments;

-- Step 2: Update any existing records to ensure they have valid UUIDs
-- (In case there are dev user IDs or invalid values)
UPDATE public.payments
SET user_id = '00000000-0000-0000-0000-000000000000'
WHERE user_id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

-- Step 3: Alter the column type to UUID
ALTER TABLE public.payments 
ALTER COLUMN user_id TYPE UUID USING user_id::uuid;

-- Step 4: Recreate the RLS policies without text casting
CREATE POLICY "Users can create their own payments" 
ON public.payments 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own payments" 
ON public.payments 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own payments" 
ON public.payments 
FOR SELECT 
USING (auth.uid() = user_id);