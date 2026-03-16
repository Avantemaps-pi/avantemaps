import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useBusinessData } from './useBusinessData';
import { Place } from '@/types/business';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/auth/useAuth';

interface RecommendationCategories {
  avanteTopChoice: Place[];
  recommendedForYou: Place[];
}

interface UserSearchedBusiness {
  business_id: number;
  search_count: number;
  last_searched_at: string;
}

const fetchUserSearches = async (userId: string): Promise<number[]> => {
  const { data, error } = await supabase
    .rpc('get_user_recommended_businesses', { 
      p_user_id: userId, 
      p_limit: 10 
    });

  if (error) {
    console.error('Error fetching user searches:', error);
    return [];
  }

  return data && data.length > 0
    ? (data as UserSearchedBusiness[]).map(item => item.business_id)
    : [];
};

export const useRecommendations = () => {
  const { places, isLoading: placesLoading } = useBusinessData();
  const { user } = useAuth();

  const { data: userSearchedBusinessIds = [], isLoading: isLoadingSearches } = useQuery({
    queryKey: ['userSearches', user?.uid],
    queryFn: () => fetchUserSearches(user!.uid),
    enabled: !!user?.uid,
    staleTime: 5 * 60 * 1000,
  });

  const recommendations = useMemo<RecommendationCategories>(() => {
    if (!places || places.length === 0) {
      return { avanteTopChoice: [], recommendedForYou: [] };
    }

    const avanteTopChoice = places
      .filter(b => b.isVerified && b.isCertified)
      .slice(0, 10);

    let recommendedForYou: Place[] = [];
    
    if (userSearchedBusinessIds.length > 0) {
      recommendedForYou = userSearchedBusinessIds
        .map(id => places.find(p => Number(p.id) === id))
        .filter((p): p is Place => p !== undefined)
        .slice(0, 10);
    }

    if (recommendedForYou.length === 0) {
      recommendedForYou = places
        .filter(b => b.isVerified)
        .slice(0, 10);
    }

    return { avanteTopChoice, recommendedForYou };
  }, [places, userSearchedBusinessIds]);

  return {
    ...recommendations,
    isLoading: placesLoading || isLoadingSearches
  };
};
