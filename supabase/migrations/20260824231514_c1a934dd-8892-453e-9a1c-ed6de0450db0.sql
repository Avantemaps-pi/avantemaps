ALTER TABLE public.users ADD COLUMN IF NOT EXISTS pi_wallet_address text;

UPDATE public.users u
SET pi_wallet_address = b.pi_wallet_address
FROM (
  SELECT DISTINCT ON (owner_id) owner_id, pi_wallet_address
  FROM public.businesses
  WHERE pi_wallet_address IS NOT NULL AND btrim(pi_wallet_address) <> ''
  ORDER BY owner_id, created_at DESC
) b
WHERE b.owner_id = u.id;