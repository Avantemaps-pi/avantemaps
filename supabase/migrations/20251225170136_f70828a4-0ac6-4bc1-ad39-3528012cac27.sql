-- Fix search_path for analytics functions
CREATE OR REPLACE FUNCTION public.get_business_analytics(
  p_business_id integer,
  p_days integer DEFAULT 7
)
RETURNS TABLE (
  view_date date,
  view_count bigint
) AS $$
BEGIN
  -- Verify ownership
  IF NOT EXISTS (
    SELECT 1 FROM public.businesses 
    WHERE id = p_business_id 
    AND owner_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
  SELECT 
    DATE(viewed_at) as view_date,
    COUNT(*) as view_count
  FROM public.business_views
  WHERE business_id = p_business_id
    AND viewed_at >= NOW() - (p_days || ' days')::interval
  GROUP BY DATE(viewed_at)
  ORDER BY view_date;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Fix search_path for stats function
CREATE OR REPLACE FUNCTION public.get_business_stats(p_business_id integer)
RETURNS TABLE (
  total_views bigint,
  total_bookmarks bigint,
  total_comments bigint,
  views_this_week bigint,
  views_last_week bigint
) AS $$
BEGIN
  -- Verify ownership
  IF NOT EXISTS (
    SELECT 1 FROM public.businesses 
    WHERE id = p_business_id 
    AND owner_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
  SELECT 
    (SELECT COUNT(*) FROM public.business_views WHERE business_id = p_business_id) as total_views,
    (SELECT COUNT(*) FROM public.bookmarks WHERE business_id = p_business_id) as total_bookmarks,
    (SELECT COUNT(*) FROM public.comments WHERE business_id = p_business_id) as total_comments,
    (SELECT COUNT(*) FROM public.business_views 
     WHERE business_id = p_business_id 
     AND viewed_at >= NOW() - interval '7 days') as views_this_week,
    (SELECT COUNT(*) FROM public.business_views 
     WHERE business_id = p_business_id 
     AND viewed_at >= NOW() - interval '14 days'
     AND viewed_at < NOW() - interval '7 days') as views_last_week;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;