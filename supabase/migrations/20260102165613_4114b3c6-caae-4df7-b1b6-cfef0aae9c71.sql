-- Create table to track user searches
CREATE TABLE public.user_searches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  business_id INTEGER REFERENCES public.businesses(id) ON DELETE CASCADE,
  search_term TEXT,
  searched_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX idx_user_searches_user_id ON public.user_searches(user_id);
CREATE INDEX idx_user_searches_business_id ON public.user_searches(business_id);
CREATE INDEX idx_user_searches_searched_at ON public.user_searches(searched_at DESC);

-- Enable Row Level Security
ALTER TABLE public.user_searches ENABLE ROW LEVEL SECURITY;

-- Users can view their own search history
CREATE POLICY "Users can view their own searches"
ON public.user_searches
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own searches
CREATE POLICY "Users can insert their own searches"
ON public.user_searches
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can delete their own search history
CREATE POLICY "Users can delete their own searches"
ON public.user_searches
FOR DELETE
USING (auth.uid() = user_id);

-- Create function to get most searched businesses for a user
CREATE OR REPLACE FUNCTION public.get_user_recommended_businesses(p_user_id UUID, p_limit INTEGER DEFAULT 10)
RETURNS TABLE (
  business_id INTEGER,
  search_count BIGINT,
  last_searched_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    us.business_id,
    COUNT(*) as search_count,
    MAX(us.searched_at) as last_searched_at
  FROM public.user_searches us
  WHERE us.user_id = p_user_id
    AND us.business_id IS NOT NULL
  GROUP BY us.business_id
  ORDER BY search_count DESC, last_searched_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;