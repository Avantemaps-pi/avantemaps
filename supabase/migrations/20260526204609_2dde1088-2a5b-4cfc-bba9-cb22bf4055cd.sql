
-- Ensure full row payloads on realtime events (so RLS filters work on UPDATE/DELETE)
ALTER TABLE public.notifications REPLICA IDENTITY FULL;
ALTER TABLE public.conversations REPLICA IDENTITY FULL;
ALTER TABLE public.messages      REPLICA IDENTITY FULL;

-- Tables are already in supabase_realtime publication; guard idempotently
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='notifications') THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='conversations') THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='messages') THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.messages';
  END IF;
END $$;

-- Realtime Authorization: default-deny Broadcast/Presence channels.
-- postgres_changes events are filtered by each table's own RLS policies
-- (owner/participant scoped), so users only receive permitted rows.
-- The policies below stop any signed-in user from subscribing to arbitrary
-- broadcast/presence topic names.
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "deny all realtime broadcast/presence by default" ON realtime.messages;
CREATE POLICY "deny all realtime broadcast/presence by default"
ON realtime.messages
AS PERMISSIVE
FOR SELECT
TO authenticated, anon
USING (false);

DROP POLICY IF EXISTS "deny all realtime broadcast/presence writes by default" ON realtime.messages;
CREATE POLICY "deny all realtime broadcast/presence writes by default"
ON realtime.messages
AS PERMISSIVE
FOR INSERT
TO authenticated, anon
WITH CHECK (false);
