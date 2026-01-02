import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/auth/useAuth';

export const useSearchTracking = () => {
  const { user } = useAuth();

  const trackBusinessSearch = useCallback(async (businessId: number, searchTerm?: string) => {
    if (!user?.uid) return;

    try {
      await supabase.from('user_searches').insert({
        user_id: user.uid,
        business_id: businessId,
        search_term: searchTerm || null,
      });
    } catch (error) {
      console.error('Failed to track search:', error);
    }
  }, [user?.uid]);

  return { trackBusinessSearch };
};
