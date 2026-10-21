import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Place } from '@/types/business';

export interface ReviewStats {
  rating: number;
  totalReviews: number;
}

export type ReviewStatsMap = Map<string, ReviewStats>;

const EMPTY_STATS: ReviewStatsMap = new Map();

// Loads every business's stats in one query, which is fine at this scale.
// If businesses grow into the thousands, switch to a query filtered by the
// business ids on screen.
const fetchReviewStats = async (): Promise<ReviewStatsMap> => {
  const { data, error } = await supabase
    .from('business_review_stats')
    .select('business_id, average_rating, review_count');

  // Ratings must never block or break a list: on failure, show no ratings.
  if (error) {
    console.warn('Failed to load review stats:', error);
    return EMPTY_STATS;
  }

  const stats: ReviewStatsMap = new Map();
  for (const row of data ?? []) {
    stats.set(row.business_id.toString(), {
      rating: Number(row.average_rating ?? 0),
      totalReviews: row.review_count ?? 0,
    });
  }
  return stats;
};

export const useReviewStats = (): ReviewStatsMap => {
  const { data } = useQuery({
    queryKey: ['review-stats'],
    queryFn: fetchReviewStats,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
  return data ?? EMPTY_STATS;
};

export const applyReviewStats = (places: Place[], stats: ReviewStatsMap): Place[] =>
  places.map((place) => {
    const s = stats.get(place.id);
    return {
      ...place,
      rating: s?.rating ?? 0,
      totalReviews: s?.totalReviews ?? 0,
    };
  });
