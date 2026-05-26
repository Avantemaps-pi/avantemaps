REVOKE EXECUTE ON FUNCTION public.upsert_user_profile(uuid, text, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.upsert_user_profile(uuid, text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.upsert_user_profile(uuid, text, text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_user_profile(uuid, text, text) TO service_role;