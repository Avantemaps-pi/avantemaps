-- Add database-level validation for comment content to prevent obvious XSS
-- Reject comments containing script tags or JavaScript event handlers
ALTER TABLE public.comments 
  ADD CONSTRAINT no_script_tags 
  CHECK (content !~* '<script|javascript:|onerror=|onclick=|onload=|<iframe');

-- Add comment for documentation
COMMENT ON CONSTRAINT no_script_tags ON public.comments IS 
  'Prevents storage of obvious XSS attack vectors in comment content';