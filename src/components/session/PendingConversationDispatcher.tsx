import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  drainPendingConversations,
  clearPendingConversations,
  pendingConversationCount,
} from '@/lib/pendingConversationQueue';
import { secureLog } from '@/utils/secureLogger';

/**
 * Global Supabase auth state listener.
 *
 * Whenever Supabase reports a fresh session (SIGNED_IN, TOKEN_REFRESHED,
 * USER_UPDATED, INITIAL_SESSION with a user), drain any queued conversation
 * creation requests that were blocked by missing/expired auth. On SIGNED_OUT
 * the queue is rejected so callers don't hang.
 *
 * Mount once near the app root, inside AuthProvider.
 */
export const PendingConversationDispatcher = () => {
  const isDrainingRef = useRef(false);

  useEffect(() => {
    const tryDrain = async (label: string) => {
      if (isDrainingRef.current) return;
      if (pendingConversationCount() === 0) return;
      isDrainingRef.current = true;
      try {
        secureLog.info(
          `[PendingConversationDispatcher] draining ${pendingConversationCount()} pending request(s) after ${label}`,
        );
        await drainPendingConversations();
      } finally {
        isDrainingRef.current = false;
      }
    };

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      const hasUser = !!session?.user?.id;
      if (
        hasUser &&
        (event === 'SIGNED_IN' ||
          event === 'TOKEN_REFRESHED' ||
          event === 'USER_UPDATED' ||
          event === 'INITIAL_SESSION')
      ) {
        // Defer to avoid running inside the synchronous auth callback.
        setTimeout(() => {
          void tryDrain(event);
        }, 0);
      }

      if (event === 'SIGNED_OUT') {
        clearPendingConversations();
      }
    });

    // Best-effort initial drain in case a session already exists at mount
    // (e.g., dispatcher mounted after auth was restored).
    void (async () => {
      const { data } = await supabase.auth.getSession();
      if (data?.session?.user?.id) {
        void tryDrain('mount');
      }
    })();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return null;
};

export default PendingConversationDispatcher;
