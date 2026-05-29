ALTER FUNCTION public.get_user_business_count(uuid) SECURITY INVOKER;
REVOKE EXECUTE ON FUNCTION public.enforce_subscription_payment() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.assign_admin_role(uuid) FROM PUBLIC, anon, authenticated;