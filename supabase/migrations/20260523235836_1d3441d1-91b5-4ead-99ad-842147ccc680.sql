
CREATE TABLE IF NOT EXISTS public.reauth_telemetry (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  business_id bigint,
  local_uid text,
  auth_uid uuid,
  retry_reason text,
  is_retry boolean NOT NULL DEFAULT false,
  message text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  user_agent text,
  url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reauth_telemetry_created_at ON public.reauth_telemetry (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reauth_telemetry_event_type ON public.reauth_telemetry (event_type);
CREATE INDEX IF NOT EXISTS idx_reauth_telemetry_auth_uid ON public.reauth_telemetry (auth_uid);

ALTER TABLE public.reauth_telemetry ENABLE ROW LEVEL SECURITY;

-- Anyone (including anon/unauthenticated re-auth flows) can insert telemetry.
-- This is write-only data for diagnostics; no PII beyond uid/businessId.
CREATE POLICY "Anyone can insert reauth telemetry"
ON public.reauth_telemetry
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Only admins can read telemetry.
CREATE POLICY "Admins can read reauth telemetry"
ON public.reauth_telemetry
FOR SELECT
TO authenticated
USING (public.has_role((SELECT auth.uid()), 'admin'));
