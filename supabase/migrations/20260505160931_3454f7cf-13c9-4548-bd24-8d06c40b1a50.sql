ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS lifecycle_id text;

CREATE INDEX IF NOT EXISTS payments_lifecycle_id_idx
  ON public.payments (lifecycle_id)
  WHERE lifecycle_id IS NOT NULL;