import { useState, useCallback, useMemo } from 'react';
import { Place } from '@/types/business';

export interface BusinessSuggestion {
  id: string;
  name: string;
  category: string;
  address: string;
  city?: string;
  country?: string;
  isVerified?: boolean;
  isCertified?: boolean;
  lat: number;
  lng: number;
  relevanceScore: number;
}

export const useBusinessAutocomplete = (businesses: Place[]) => {
  const [suggestions, setSuggestions] = useState<BusinessSuggestion[]>([]);

  const searchBusinesses = useCallback((query: string) => {
    if (!query.trim() || query.length < 2) {
      setSuggestions([]);
      return;
    }

    const searchTerm = query.toLowerCase().trim();
    const terms = searchTerm.split(/\s+/);

    const scored = businesses
      .map((business) => {
        let score = 0;
        const name = business.name?.toLowerCase() || '';
        const category = business.category?.toLowerCase() || '';
        const description = business.description?.toLowerCase() || '';
        const keywords = business.keywords?.map(k => k.toLowerCase()) || [];
        const businessTypes = business.business_types?.map(t => t.toLowerCase()) || [];
        const city = business.city?.toLowerCase() || '';

        // Exact name match (highest priority)
        if (name === searchTerm) {
          score += 100;
        } else if (name.startsWith(searchTerm)) {
          score += 80;
        } else if (name.includes(searchTerm)) {
          score += 60;
        }

        // Word-by-word matching for multi-word queries
        terms.forEach(term => {
          if (name.includes(term)) score += 30;
          if (category.includes(term)) score += 25;
          if (keywords.some(k => k.includes(term))) score += 20;
          if (businessTypes.some(t => t.includes(term))) score += 15;
          if (description.includes(term)) score += 10;
          if (city.includes(term)) score += 5;
        });

        return {
          business,
          score
        };
      })
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 6);

    const results: BusinessSuggestion[] = scored.map(({ business, score }) => ({
      id: business.id,
      name: business.name,
      category: business.category || 'Business',
      address: business.address,
      city: business.city,
      country: business.country,
      isVerified: business.isVerified,
      isCertified: business.isCertified,
      lat: business.position?.lat || business.location?.lat || 0,
      lng: business.position?.lng || business.location?.lng || 0,
      relevanceScore: score
    }));

    setSuggestions(results);
  }, [businesses]);

  const clearSuggestions = useCallback(() => {
    setSuggestions([]);
  }, []);

  return {
    suggestions,
    searchBusinesses,
    clearSuggestions
  };
};
