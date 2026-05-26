-- Revoke EXECUTE on trigger function from all RPC-callable roles
REVOKE EXECUTE ON FUNCTION public.update_comment_vote_counts() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.update_comment_vote_counts() FROM anon;
REVOKE EXECUTE ON FUNCTION public.update_comment_vote_counts() FROM authenticated;