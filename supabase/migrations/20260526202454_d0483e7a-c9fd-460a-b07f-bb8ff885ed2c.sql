
DROP POLICY IF EXISTS "Authenticated users can view businesses" ON public.businesses;
DROP POLICY IF EXISTS "Public can view verified or certified businesses" ON public.businesses;

CREATE POLICY "Owners can view their own businesses"
ON public.businesses
FOR SELECT
TO authenticated
USING (owner_id = (SELECT auth.uid()));

-- Re-grant SELECT on pi_wallet_address to authenticated so owners can read it
-- via the new owner-only policy (a prior migration revoked it from anon).
GRANT SELECT (pi_wallet_address) ON public.businesses TO authenticated;
