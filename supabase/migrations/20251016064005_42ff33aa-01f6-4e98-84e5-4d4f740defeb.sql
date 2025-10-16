-- Create comments table
CREATE TABLE public.comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id integer NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  content text NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  upvotes integer DEFAULT 0 NOT NULL,
  downvotes integer DEFAULT 0 NOT NULL,
  report_count integer DEFAULT 0 NOT NULL,
  is_hidden boolean DEFAULT false NOT NULL,
  CONSTRAINT content_length CHECK (char_length(content) >= 1 AND char_length(content) <= 2000)
);

-- Create comment votes table
CREATE TABLE public.comment_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id uuid NOT NULL REFERENCES public.comments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  vote_type text NOT NULL CHECK (vote_type IN ('up', 'down')),
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  UNIQUE(comment_id, user_id)
);

-- Create comment reports table
CREATE TABLE public.comment_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id uuid NOT NULL REFERENCES public.comments(id) ON DELETE CASCADE,
  reported_by uuid NOT NULL,
  reason text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  UNIQUE(comment_id, reported_by)
);

-- Create indexes for performance
CREATE INDEX idx_comments_business_id ON public.comments(business_id);
CREATE INDEX idx_comments_user_id ON public.comments(user_id);
CREATE INDEX idx_comments_created_at ON public.comments(created_at DESC);
CREATE INDEX idx_comment_votes_comment_id ON public.comment_votes(comment_id);
CREATE INDEX idx_comment_reports_comment_id ON public.comment_reports(comment_id);

-- Enable RLS
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comment_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comment_reports ENABLE ROW LEVEL SECURITY;

-- RLS Policies for comments table
CREATE POLICY "Anyone can view non-hidden comments"
  ON public.comments
  FOR SELECT
  USING (is_hidden = false OR auth.uid() = user_id OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'moderator'));

CREATE POLICY "Authenticated users can create comments"
  ON public.comments
  FOR INSERT
  WITH CHECK (auth.uid() = user_id AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can update their own comments"
  ON public.comments
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id AND is_hidden = (SELECT c.is_hidden FROM comments c WHERE c.id = comments.id));

CREATE POLICY "Admins can update any comment"
  ON public.comments
  FOR UPDATE
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'moderator'));

CREATE POLICY "Users can delete their own comments"
  ON public.comments
  FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can delete any comment"
  ON public.comments
  FOR DELETE
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'moderator'));

-- RLS Policies for comment_votes table
CREATE POLICY "Anyone can view votes"
  ON public.comment_votes
  FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can vote"
  ON public.comment_votes
  FOR INSERT
  WITH CHECK (auth.uid() = user_id AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can update their own votes"
  ON public.comment_votes
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own votes"
  ON public.comment_votes
  FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for comment_reports table
CREATE POLICY "Users can view their own reports"
  ON public.comment_reports
  FOR SELECT
  USING (auth.uid() = reported_by OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'moderator'));

CREATE POLICY "Authenticated users can report comments"
  ON public.comment_reports
  FOR INSERT
  WITH CHECK (auth.uid() = reported_by AND auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage reports"
  ON public.comment_reports
  FOR ALL
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'moderator'));

-- Function to update comment vote counts
CREATE OR REPLACE FUNCTION public.update_comment_vote_counts()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    UPDATE public.comments
    SET 
      upvotes = (SELECT COUNT(*) FROM public.comment_votes WHERE comment_id = NEW.comment_id AND vote_type = 'up'),
      downvotes = (SELECT COUNT(*) FROM public.comment_votes WHERE comment_id = NEW.comment_id AND vote_type = 'down'),
      updated_at = now()
    WHERE id = NEW.comment_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.comments
    SET 
      upvotes = (SELECT COUNT(*) FROM public.comment_votes WHERE comment_id = OLD.comment_id AND vote_type = 'up'),
      downvotes = (SELECT COUNT(*) FROM public.comment_votes WHERE comment_id = OLD.comment_id AND vote_type = 'down'),
      updated_at = now()
    WHERE id = OLD.comment_id;
    RETURN OLD;
  END IF;
END;
$$;

-- Function to update comment report counts
CREATE OR REPLACE FUNCTION public.update_comment_report_counts()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.comments
    SET 
      report_count = (SELECT COUNT(*) FROM public.comment_reports WHERE comment_id = NEW.comment_id),
      is_hidden = CASE WHEN (SELECT COUNT(*) FROM public.comment_reports WHERE comment_id = NEW.comment_id) >= 5 THEN true ELSE is_hidden END,
      updated_at = now()
    WHERE id = NEW.comment_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.comments
    SET 
      report_count = (SELECT COUNT(*) FROM public.comment_reports WHERE comment_id = OLD.comment_id),
      updated_at = now()
    WHERE id = OLD.comment_id;
    RETURN OLD;
  END IF;
END;
$$;

-- Triggers for automatic vote count updates
CREATE TRIGGER trigger_update_comment_vote_counts
AFTER INSERT OR UPDATE OR DELETE ON public.comment_votes
FOR EACH ROW
EXECUTE FUNCTION public.update_comment_vote_counts();

-- Triggers for automatic report count updates
CREATE TRIGGER trigger_update_comment_report_counts
AFTER INSERT OR DELETE ON public.comment_reports
FOR EACH ROW
EXECUTE FUNCTION public.update_comment_report_counts();