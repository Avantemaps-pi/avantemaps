import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/auth';
import { SubscriptionTier } from '@/utils/piNetwork';

export const getBusinessLimit = (subscriptionTier: string): number => {
  switch (subscriptionTier) {
    case SubscriptionTier.SMALL_BUSINESS:
      return 3;
    case SubscriptionTier.ORGANIZATION:
      return 5;
    case SubscriptionTier.INDIVIDUAL:
    default:
      return 1;
  }
};

export interface UseBusinessLimitReturn {
  currentCount: number;
  limit: number;
  hasReachedLimit: boolean;
  isApproachingLimit: boolean;
  isLoading: boolean;
  subscriptionTier: string;
}

export const useBusinessLimit = (): UseBusinessLimitReturn => {
  const { user } = useAuth();
  const [currentCount, setCurrentCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const subscriptionTier = user?.subscriptionTier || SubscriptionTier.INDIVIDUAL;
  const limit = getBusinessLimit(subscriptionTier);

  const fetchCount = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const sessionUserId = session?.user?.id;

      if (!sessionUserId) {
        setCurrentCount(0);
        setIsLoading(false);
        return;
      }

      const { count, error } = await supabase
        .from('businesses')
        .select('*', { count: 'exact', head: true })
        .eq('owner_id', sessionUserId);

      if (error) {
        console.error('Error fetching business count:', error);
        setCurrentCount(0);
      } else {
        setCurrentCount(count || 0);
      }
    } catch (err) {
      console.error('Unexpected error fetching business count:', err);
      setCurrentCount(0);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCount();
  }, [fetchCount]);

  const hasReachedLimit = currentCount >= limit;
  const isApproachingLimit = currentCount === limit - 1 && limit > 1;

  return {
    currentCount,
    limit,
    hasReachedLimit,
    isApproachingLimit,
    isLoading,
    subscriptionTier,
  };
};
