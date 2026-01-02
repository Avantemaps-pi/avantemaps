import { useMemo, useEffect, useState } from 'react';
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

export const useRecommendations = () => {
  const { places, isLoading: placesLoading } = useBusinessData();
  const { user } = useAuth();
  const [userSearchedBusinessIds, setUserSearchedBusinessIds] = useState<number[]>([]);
  const [isLoadingSearches, setIsLoadingSearches] = useState(false);

  // Fetch user's most searched businesses
  useEffect(() => {
    const fetchUserSearches = async () => {
      if (!user?.uid) {
        setUserSearchedBusinessIds([]);
        return;
      }

      setIsLoadingSearches(true);
      try {
        const { data, error } = await supabase
          .rpc('get_user_recommended_businesses', { 
            p_user_id: user.uid, 
            p_limit: 10 
          });

        if (error) {
          console.error('Error fetching user searches:', error);
          return;
        }

        if (data && data.length > 0) {
          const businessIds = (data as UserSearchedBusiness[]).map(item => item.business_id);
          setUserSearchedBusinessIds(businessIds);
        }
      } catch (error) {
        console.error('Failed to fetch user searches:', error);
      } finally {
        setIsLoadingSearches(false);
      }
    };

    fetchUserSearches();
  }, [user?.uid]);

  const recommendations = useMemo<RecommendationCategories>(() => {
    if (!places || places.length === 0) {
      return {
        avanteTopChoice: [],
        recommendedForYou: []
      };
    }

    // Avante Top Choice: Verified AND Certified businesses (highest quality)
    const avanteTopChoice = places
      .filter(b => b.isVerified && b.isCertified)
      .slice(0, 10);

    // Recommended for You: Based on user's search history
    let recommendedForYou: Place[] = [];
    
    if (userSearchedBusinessIds.length > 0) {
      // Get businesses that user has searched for, maintaining search frequency order
      recommendedForYou = userSearchedBusinessIds
        .map(id => places.find(p => Number(p.id) === id))
        .filter((p): p is Place => p !== undefined)
        .slice(0, 10);
    }

    // Fallback: If user has no search history, show verified businesses
    if (recommendedForYou.length === 0) {
      recommendedForYou = places
        .filter(b => b.isVerified)
        .slice(0, 10);
    }

    return {
      avanteTopChoice,
      recommendedForYou
    };
  }, [places, userSearchedBusinessIds]);

  return {
    ...recommendations,
    isLoading: placesLoading || isLoadingSearches
  };
};
