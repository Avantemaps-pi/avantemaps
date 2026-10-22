import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface BusinessReview {
  id: string;
  user_id: string;
  rating: number;
  content: string | null;
  created_at: string;
  updated_at: string;
}

// Written reviews for one business, newest first. RLS: "Anyone can view reviews".
export const useBusinessReviews = (businessId: string | undefined) => {
  const { data: reviews = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['reviews', businessId],
    queryFn: async (): Promise<BusinessReview[]> => {
      const { data, error } = await supabase
        .from('reviews')
        .select('id, user_id, rating, content, created_at, updated_at')
        .eq('business_id', Number(businessId))
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as BusinessReview[];
    },
    enabled: !!businessId,
    staleTime: 60_000,
  });

  return { reviews, isLoading, isError, refetch };
};
