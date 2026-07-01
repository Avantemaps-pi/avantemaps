
-- Performance indexes for frequently queried columns and foreign keys

-- comment_votes: user_id lookups (per-user vote scans)
CREATE INDEX IF NOT EXISTS idx_comment_votes_user_id
  ON public.comment_votes (user_id);

-- comment_reports: reporter lookups
CREATE INDEX IF NOT EXISTS idx_comment_reports_reported_by
  ON public.comment_reports (reported_by);

-- messages: filter by sender (RLS checks + user history)
CREATE INDEX IF NOT EXISTS idx_messages_sender_id
  ON public.messages (sender_id);

-- notifications: composite for list-by-user-sorted-by-time (most common query)
CREATE INDEX IF NOT EXISTS idx_notifications_user_created
  ON public.notifications (user_id, created_at DESC);

-- notifications: partial index for unread counts
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
  ON public.notifications (user_id)
  WHERE read = false;

-- subscriptions: composite for "latest subscription per user"
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_start
  ON public.subscriptions (user_id, start_date DESC);

-- bookmarks: user_id-only lookups (unique index covers prefix but explicit
-- single-col index helps the planner with count/list-by-user)
CREATE INDEX IF NOT EXISTS idx_bookmarks_user_id
  ON public.bookmarks (user_id);

-- businesses: verification status filter for map views
CREATE INDEX IF NOT EXISTS idx_businesses_verification_status
  ON public.businesses (verification_status);

-- businesses: created_at for recency sort
CREATE INDEX IF NOT EXISTS idx_businesses_created_at
  ON public.businesses (created_at DESC);

-- reviews: created_at for chronological review listings
CREATE INDEX IF NOT EXISTS idx_reviews_created_at
  ON public.reviews (created_at DESC);
