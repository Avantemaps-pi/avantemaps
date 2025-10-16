import { useMemo } from 'react';
import { useBusinessData } from './useBusinessData';
import { Place } from '@/types/business';

interface RecommendationCategories {
  avanteTopChoice: Place[];
  suggestedForYou: Place[];
  recommendedForYou: Place[];
}

export const useRecommendations = () => {
  const { places, isLoading } = useBusinessData();

  const recommendations = useMemo<RecommendationCategories>(() => {
    if (!places || places.length === 0) {
      return {
        avanteTopChoice: [],
        suggestedForYou: [],
        recommendedForYou: []
      };
    }

    // Avante Top Choice: Verified AND Certified businesses (highest quality)
    const avanteTopChoice = places
      .filter(b => b.isVerified && b.isCertified)
      .slice(0, 10);

    // Suggested for You: Recently added businesses (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const suggestedForYou = places
      .filter(b => {
        // Since we don't have created_at in Place interface, just show verified businesses
        return b.isVerified;
      })
      .slice(0, 10);

    // Recommended for You: All verified businesses
    const recommendedForYou = places
      .filter(b => b.isVerified)
      .slice(0, 10);

    return {
      avanteTopChoice,
      suggestedForYou,
      recommendedForYou
    };
  }, [places]);

  return {
    ...recommendations,
    isLoading
  };
};
