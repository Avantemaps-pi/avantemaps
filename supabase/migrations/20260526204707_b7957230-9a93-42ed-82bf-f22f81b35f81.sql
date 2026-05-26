
-- Drop the existing public read policy and replace with a narrower one
DROP POLICY IF EXISTS "Public can read message fee setting" ON public.platform_settings;

-- Authenticated users may read ONLY the unverified message fee key (needed for the chat fee notice).
CREATE POLICY "Authenticated can read message fee setting"
ON public.platform_settings
FOR SELECT
TO authenticated
USING (key = 'unverified_message_fee_pi');

-- Revoke anon access entirely; keep authenticated limited via RLS above.
REVOKE ALL ON public.platform_settings FROM anon;
GRANT SELECT ON public.platform_settings TO authenticated;
GRANT ALL ON public.platform_settings TO service_role;

-- "Admins can manage platform settings" (ALL) policy remains unchanged and
-- gives admins full read/write access to every key (including
-- platform_revenue_share, custom_fee_*, etc.).
