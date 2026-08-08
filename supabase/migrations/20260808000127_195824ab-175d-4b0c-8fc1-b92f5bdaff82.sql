CREATE OR REPLACE FUNCTION public.get_wallet_balance(p_user_id uuid)
RETURNS numeric
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_balance numeric;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF auth.uid() <> p_user_id AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  SELECT COALESCE(SUM(amount_pi), 0) INTO v_balance
  FROM public.wallet_ledger
  WHERE user_id = p_user_id;

  RETURN v_balance;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.get_wallet_balance(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_wallet_balance(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_wallet_balance(uuid) TO service_role;