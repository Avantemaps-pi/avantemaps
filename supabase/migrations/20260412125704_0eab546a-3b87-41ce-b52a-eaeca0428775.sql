
CREATE OR REPLACE FUNCTION public.get_landing_stats()
RETURNS json
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT json_build_object(
    'business_count', (SELECT COUNT(*) FROM businesses),
    'user_count', (SELECT COUNT(*) FROM users),
    'country_count', (SELECT COUNT(DISTINCT country) FROM businesses WHERE country IS NOT NULL)
  )
$$;
