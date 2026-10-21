import { supabase } from '@/integrations/supabase/client';

/**
 * The Supabase user ID from the live session, or null when signed out.
 * Use this for anything sent to the database: RLS compares against
 * auth.uid(), and `user.uid` from useAuth() can be the Pi ID or stale.
 */
export async function getSessionUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.user?.id ?? null;
}
