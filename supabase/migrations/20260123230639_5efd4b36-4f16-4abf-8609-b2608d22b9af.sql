-- Fix Critical RLS Policy Issues
-- 1. Remove the overly permissive "Anyone can insert views" policy on business_views
-- 2. Restrict notifications INSERT to service_role only

-- =====================================================
-- FIX 1: business_views - Remove public INSERT access
-- Views should only be inserted via edge function with service role
-- =====================================================
DROP POLICY IF EXISTS "Anyone can insert views" ON business_views;

-- Create restrictive policy - only service role can insert
-- This ensures views are tracked server-side via edge functions
CREATE POLICY "Service role can insert views"
ON business_views FOR INSERT
TO service_role
WITH CHECK (true);

-- =====================================================
-- FIX 2: notifications - Already has service_role restriction
-- But let's drop and recreate to be explicit
-- =====================================================
DROP POLICY IF EXISTS "Service can insert notifications" ON notifications;

-- Explicitly restrict to service_role only
CREATE POLICY "Service role can insert notifications"
ON notifications FOR INSERT
TO service_role
WITH CHECK (true);

-- =====================================================
-- FIX 3: Strengthen users table RLS - add explicit anon denial
-- =====================================================
-- Add policy to explicitly deny anonymous access attempts
CREATE POLICY "Deny anonymous access to users"
ON users FOR SELECT
TO anon
USING (false);

-- =====================================================
-- FIX 4: Strengthen payments table RLS - add explicit anon denial
-- =====================================================
CREATE POLICY "Deny anonymous access to payments"
ON payments FOR SELECT
TO anon
USING (false);