-- Fix the subscriptions table check constraint to use hyphens instead of underscores
-- Drop the existing constraint that expects underscores
ALTER TABLE public.subscriptions DROP CONSTRAINT IF EXISTS subscriptions_plan_check;

-- Add the correct constraint that matches our TypeScript enum (with hyphens)
ALTER TABLE public.subscriptions ADD CONSTRAINT subscriptions_plan_check 
CHECK (plan IN ('individual', 'small-business', 'organization'));