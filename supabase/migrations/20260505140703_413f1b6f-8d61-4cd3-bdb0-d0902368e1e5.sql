-- Ensure unique-violation safe inserts/updates for payment identifiers.
-- payment_id is already UNIQUE. Add a partial UNIQUE index on txid so the
-- same on-chain transaction can never be attached to two payment rows.
CREATE UNIQUE INDEX IF NOT EXISTS payments_txid_unique
  ON public.payments (txid)
  WHERE txid IS NOT NULL;

-- Supporting indexes for common lookups in idempotency checks.
CREATE INDEX IF NOT EXISTS payments_user_id_idx
  ON public.payments (user_id);

CREATE INDEX IF NOT EXISTS payments_user_created_idx
  ON public.payments (user_id, created_at DESC);