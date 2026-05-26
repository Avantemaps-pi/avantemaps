-- Revoke EXECUTE on the update_updated_at_column trigger function from all API-exposed roles
-- This function is only used internally by BEFORE UPDATE triggers and should never be called via /rest/v1/rpc/
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM anon;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM authenticated;