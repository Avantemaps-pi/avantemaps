
-- 1. subscriptions: remove client write access
DROP POLICY IF EXISTS "Users can insert their own subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Users can update their own subscriptions" ON public.subscriptions;

-- 2. platform_settings: restrict public read to only the fee key
DROP POLICY IF EXISTS "Anyone can read platform settings" ON public.platform_settings;
CREATE POLICY "Public can read message fee setting"
ON public.platform_settings
FOR SELECT
TO anon, authenticated
USING (key = 'unverified_message_fee_pi');

-- 3. businesses: revoke pi_wallet_address from anon role
REVOKE SELECT (pi_wallet_address) ON public.businesses FROM anon;

-- 4. comment_reports: fix broken policies
DROP POLICY IF EXISTS "Users can view their own reports" ON public.comment_reports;
DROP POLICY IF EXISTS "Anon insert consolidated" ON public.comment_reports;

CREATE POLICY "Users can view their own reports"
ON public.comment_reports
FOR SELECT
TO authenticated
USING (reported_by = (SELECT auth.uid()));

CREATE POLICY "Authenticated users can report comments"
ON public.comment_reports
FOR INSERT
TO authenticated
WITH CHECK (reported_by = (SELECT auth.uid()));

-- 5. verification_audit: fix admin read policy
DROP POLICY IF EXISTS "Admins can view verification audit" ON public.verification_audit;
CREATE POLICY "Admins can view verification audit"
ON public.verification_audit
FOR SELECT
TO authenticated
USING (
  public.has_role((SELECT auth.uid()), 'admin'::app_role)
  OR public.has_role((SELECT auth.uid()), 'moderator'::app_role)
);

-- 6. Drop unused SECURITY DEFINER PostGIS wrapper views
DROP VIEW IF EXISTS public.spatial_ref_sys_public;
DROP VIEW IF EXISTS public.spatial_ref_sys_public_v2;
