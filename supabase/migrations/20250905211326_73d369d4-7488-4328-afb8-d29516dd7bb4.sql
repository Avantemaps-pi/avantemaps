-- Fix the security definer view warning by removing the view
-- and relying solely on the secure function approach

-- Drop the problematic view
DROP VIEW IF EXISTS public.public_business_view;

-- Revoke any permissions that were granted to the view
-- (This is safe since we're dropping the view anyway)

-- The get_public_business_info() function already provides secure access
-- and is marked as SECURITY DEFINER which is appropriate for functions
-- No additional changes needed - the function approach is the recommended pattern