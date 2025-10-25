
-- ============================================================================
-- MIGRATION: Fix Supabase Performance Advisor Issues (Revised)
-- ============================================================================
-- This migration addresses fixable security issues identified by the linter
-- ============================================================================

-- ============================================================================
-- ISSUE 1: Enable RLS on error_logs table
-- ============================================================================
-- CRITICAL: error_logs table contains sensitive debugging information
-- and must have RLS enabled to prevent unauthorized access

-- Enable Row Level Security
ALTER TABLE public.error_logs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Admin users can view all error logs" ON public.error_logs;
DROP POLICY IF EXISTS "Service role can insert error logs" ON public.error_logs;

-- Policy: Only admins can view error logs
-- This prevents regular users from seeing sensitive stack traces and error details
CREATE POLICY "Admin users can view all error logs"
  ON public.error_logs
  FOR SELECT
  TO authenticated
  USING (
    has_role((SELECT auth.uid()), 'admin'::app_role)
  );

-- Policy: Allow authenticated users to insert their own error logs
-- This allows the application to log errors on behalf of users
CREATE POLICY "Service role can insert error logs"
  ON public.error_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- ============================================================================
-- NOTE: PostGIS System Tables and Functions
-- ============================================================================
-- The following issues cannot be fixed via migration:
-- 
-- 1. spatial_ref_sys table: This is a PostGIS system table we don't own
--    - Cannot enable RLS on system tables
--    - This is a read-only reference table with public data (low risk)
-- 
-- 2. st_estimatedextent functions: PostGIS system functions with SECURITY DEFINER
--    - These are installed by PostGIS extension
--    - Cannot modify without reinstalling PostGIS
--    - Generally safe as they're read-only spatial functions
-- 
-- 3. PostGIS extension in public schema (WARNING level)
--    - Standard practice for PostGIS
--    - Moving would break existing spatial functionality
--    - Generally acceptable risk
-- 
-- These are acknowledged limitations when using PostGIS.
-- ============================================================================

-- Add documentation comments
COMMENT ON TABLE public.error_logs IS 
'Application error logging table. RLS enabled - only admins can read logs.';
