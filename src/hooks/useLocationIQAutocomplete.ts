import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface PlacePrediction {
  placeId: string;
  description: string;
  mainText: string;
  secondaryText: string;
  lat: number;
  lon: number;
  originalQuery?: string;
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

export interface GeocodingOptions {
  viewbox?: {
    minLon: number;
    minLat: number;
    maxLon: number;
    maxLat: number;
  };
  countrycodes?: string;
  tag?: string;
}

export const useLocationIQAutocomplete = () => {
  const [predictions, setPredictions] = useState<PlacePrediction[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const getSuggestions = useCallback(async (input: string, options?: GeocodingOptions): Promise<void> => {
    if (!input.trim() || input.length < 3) {
      setPredictions([]);
      return;
    }

    setIsLoading(true);

    try {
      // Build request body with optional parameters
      const requestBody: Record<string, any> = { address: input };
      
      // Add viewbox if provided (format: "minLon,minLat,maxLon,maxLat")
      if (options?.viewbox) {
        const { minLon, minLat, maxLon, maxLat } = options.viewbox;
        requestBody.viewbox = `${minLon},${minLat},${maxLon},${maxLat}`;
      }
      
      // Add country codes if provided
      if (options?.countrycodes) {
        requestBody.countrycodes = options.countrycodes;
      }
      
      // Add tag filter if provided
      if (options?.tag) {
        requestBody.tag = options.tag;
      }

      const { data, error } = await supabase.functions.invoke('geocode-address', {
        body: requestBody
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
            originalQuery: input,
            mainText: (() => {
              const addr = suggestion.address;
              if (addr?.house_number && addr?.road) {
                return `${addr.house_number} ${addr.road}`;
              }
              if (addr?.road) {
                return addr.road;
              }
              return suggestion.display_name?.split(',')[0] || '';
            })(),
            secondaryText: (() => {
              const addr = suggestion.address;
              // Use normalized city from API (normalizecity=1 param)
              const city = addr?.city || addr?.town || addr?.village;
              const state = addr?.state || addr?.province;
              const country = addr?.country;
              const parts = [city, state, country].filter(Boolean);
              return parts.join(', ');
            })(),
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

      // Use cached coordinates from prediction (no need to re-geocode)
      return {
        name: prediction.mainText,
        address: prediction.description,
        lat: prediction.lat,
        lng: prediction.lon,
        placeId,
      };
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
