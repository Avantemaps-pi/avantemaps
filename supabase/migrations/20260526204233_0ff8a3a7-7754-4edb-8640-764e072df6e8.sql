
-- Strict RLS for subscriptions: only service_role (server-side, after payment validation) may write.
-- Authenticated users may read their own row; no client writes are ever allowed.

-- 1. Lock down grants explicitly
REVOKE ALL ON public.subscriptions FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.subscriptions TO authenticated;
GRANT ALL ON public.subscriptions TO service_role;

-- 2. Ensure RLS is on and enforced (even for table owner)
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions FORCE ROW LEVEL SECURITY;

-- 3. Drop any pre-existing write policies (none expected, but defensive)
DROP POLICY IF EXISTS "Users can insert their own subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Users can update their own subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Users can delete their own subscriptions" ON public.subscriptions;

-- 4. Explicit restrictive deny for all client write attempts (defense-in-depth
--    in case a future permissive policy is mistakenly added).
CREATE POLICY "Block client inserts on subscriptions"
ON public.subscriptions AS RESTRICTIVE
FOR INSERT TO anon, authenticated
WITH CHECK (false);

CREATE POLICY "Block client updates on subscriptions"
ON public.subscriptions AS RESTRICTIVE
FOR UPDATE TO anon, authenticated
USING (false) WITH CHECK (false);

CREATE POLICY "Block client deletes on subscriptions"
ON public.subscriptions AS RESTRICTIVE
FOR DELETE TO anon, authenticated
USING (false);

-- 5. Server-side guard: any write must be performed by service_role and must
--    reference a completed payment for the same user. This prevents an
--    accidental edge-function bug or compromised JWT from upgrading a plan
--    without a validated Pi payment.
CREATE OR REPLACE FUNCTION public.enforce_subscription_payment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_service_role boolean;
  has_completed_payment boolean;
BEGIN
  is_service_role := (current_setting('request.jwt.claim.role', true) = 'service_role')
                     OR (current_user = 'service_role')
                     OR (current_user = 'postgres')
                     OR (current_user = 'supabase_admin');

  IF NOT is_service_role THEN
    RAISE EXCEPTION 'subscriptions can only be modified by the server after payment validation';
  END IF;

  -- Require at least one completed payment by this user that references a
  -- subscription plan in its metadata. Skip for downgrade-to-individual rows
  -- (free tier) and for end_date-only updates (cancellations/expirations).
  IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND NEW.plan IS DISTINCT FROM OLD.plan AND NEW.plan <> 'individual') THEN
    IF NEW.plan IS NOT NULL AND NEW.plan <> 'individual' THEN
      SELECT EXISTS (
        SELECT 1
        FROM public.payments p
        WHERE p.user_id = NEW.user_id
          AND (p.status->>'developer_completed' = 'true'
               OR p.status->>'transaction_verified' = 'true')
          AND (p.metadata->>'plan' = NEW.plan
               OR p.metadata->>'subscriptionTier' = NEW.plan
               OR p.metadata->>'tier' = NEW.plan)
      ) INTO has_completed_payment;

      IF NOT has_completed_payment THEN
        RAISE EXCEPTION 'No completed payment found for user % and plan %', NEW.user_id, NEW.plan;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_subscription_payment_trg ON public.subscriptions;
CREATE TRIGGER enforce_subscription_payment_trg
BEFORE INSERT OR UPDATE ON public.subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.enforce_subscription_payment();
