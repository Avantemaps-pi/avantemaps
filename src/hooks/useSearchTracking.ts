import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/auth/useAuth';
import { getSessionUserId } from '@/lib/sessionUserId';

export const useSearchTracking = () => {
  const { user } = useAuth();

  const trackBusinessSearch = useCallback(async (businessId: number, searchTerm?: string) => {
    if (!user?.uid) return;

    try {
      // RLS checks user_id = auth.uid(); user.uid can be the Pi ID or stale.
      const userId = await getSessionUserId();
      if (!userId) return;
      await supabase.from('user_searches').insert({
        user_id: userId,
        business_id: businessId,
        search_term: searchTerm || null,
      });
    } catch (error) {
      console.error('Failed to track search:', error);
    }
  }, [user?.uid]);

  return { trackBusinessSearch };
};
