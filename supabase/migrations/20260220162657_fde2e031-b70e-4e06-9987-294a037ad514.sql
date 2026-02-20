
CREATE TABLE IF NOT EXISTS public.contact_otps (
  email TEXT PRIMARY KEY,
  otp TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  verified BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.contact_otps ENABLE ROW LEVEL SECURITY;

-- Only service role can manage OTPs
CREATE POLICY "Service role can manage contact otps"
  ON public.contact_otps
  FOR ALL
  USING (true)
  WITH CHECK (true);
