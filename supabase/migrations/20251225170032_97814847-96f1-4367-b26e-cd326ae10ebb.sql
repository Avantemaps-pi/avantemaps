-- Create business_views table to track actual views
CREATE TABLE public.business_views (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id integer NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  user_id uuid,
  viewed_at timestamp with time zone NOT NULL DEFAULT now(),
  user_agent text,
  referrer text
);

-- Create index for efficient querying
CREATE INDEX idx_business_views_business_id ON public.business_views(business_id);
CREATE INDEX idx_business_views_viewed_at ON public.business_views(viewed_at);
CREATE INDEX idx_business_views_user_id ON public.business_views(user_id);

-- Enable RLS
ALTER TABLE public.business_views ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can insert views (for tracking)
CREATE POLICY "Anyone can insert views"
ON public.business_views
FOR INSERT
WITH CHECK (true);

-- Policy: Business owners can view analytics for their own businesses
CREATE POLICY "Owners can view their business analytics"
ON public.business_views
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.businesses 
    WHERE businesses.id = business_views.business_id 
    AND businesses.owner_id = auth.uid()
  )
);

-- Create function to get business analytics
CREATE OR REPLACE FUNCTION get_business_analytics(
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get total business stats
CREATE OR REPLACE FUNCTION get_business_stats(p_business_id integer)
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
$$ LANGUAGE plpgsql SECURITY DEFINER;