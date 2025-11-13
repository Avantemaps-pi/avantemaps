import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface PlacePrediction {
  placeId: string;
  description: string;
  mainText: string;
  secondaryText: string;
  lat: number;
  lon: number;
  address: {
    house_number?: string;
    road?: string;
    city?: string;
    town?: string;
    village?: string;
    municipality?: string;
    state?: string;
    province?: string;
    region?: string;
    postcode?: string;
    country?: string;
  };
}

export interface PlaceDetails {
  name: string;
  address: string;
  lat: number;
  lng: number;
  placeId: string;
}

export const useLocationIQAutocomplete = () => {
  const [predictions, setPredictions] = useState<PlacePrediction[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const getSuggestions = useCallback(async (input: string): Promise<void> => {
    if (!input.trim() || input.length < 3) {
      setPredictions([]);
      return;
    }

    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('geocode-address', {
        body: { address: input }
      });

      setIsLoading(false);

      if (error) {
        console.error('Error fetching autocomplete predictions:', error);
        setPredictions([]);
        return;
      }

      if (data?.suggestions) {
        setPredictions(
          data.suggestions.map((suggestion: any) => ({
            placeId: suggestion.place_id || suggestion.osm_id || `${suggestion.lat}-${suggestion.lon}`,
            description: suggestion.display_name || suggestion.name || '',
            mainText: suggestion.display_name?.split(',')[0] || '',
            secondaryText: suggestion.display_name?.split(',').slice(1).join(',').trim() || '',
            lat: suggestion.lat,
            lon: suggestion.lon,
            address: {
              house_number: suggestion.address?.house_number || '',
              road: suggestion.address?.road || '',
              city: suggestion.address?.city || '',
              town: suggestion.address?.town || '',
              village: suggestion.address?.village || '',
              municipality: suggestion.address?.municipality || '',
              state: suggestion.address?.state || '',
              province: suggestion.address?.province || '',
              region: suggestion.address?.region || '',
              postcode: suggestion.address?.postcode || '',
              country: suggestion.address?.country || '',
            }
          }))
        );
      } else {
        setPredictions([]);
      }
    } catch (error) {
      console.error('Error fetching autocomplete predictions:', error);
      setIsLoading(false);
      setPredictions([]);
    }
  }, []);

  const getPlaceDetails = useCallback(
    async (placeId: string): Promise<PlaceDetails | null> => {
      // Find the prediction that matches this placeId
      const prediction = predictions.find(p => p.placeId === placeId);
      
      if (!prediction) {
        console.error('Place not found in predictions');
        return null;
      }

      // For LocationIQ, we need to geocode again to get precise coordinates
      // Or we could store the coordinates in the prediction
      try {
        const { data, error } = await supabase.functions.invoke('geocode-address', {
          body: { address: prediction.description }
        });

        if (error || !data?.suggestions?.[0]) {
          console.error('Error fetching place details:', error);
          return null;
        }

        const place = data.suggestions[0];
        return {
          name: prediction.mainText,
          address: prediction.description,
          lat: parseFloat(place.lat),
          lng: parseFloat(place.lon),
          placeId,
        };
      } catch (error) {
        console.error('Error fetching place details:', error);
        return null;
      }
    },
    [predictions]
  );

  const clearSuggestions = useCallback(() => {
    setPredictions([]);
  }, []);

  return {
    predictions,
    isLoading,
    getSuggestions,
    getPlaceDetails,
    clearSuggestions,
  };
};
