import { useState, useEffect, useCallback, useRef } from 'react';
import { MAPS_CONFIG } from '@/config/environment';

export interface PlacePrediction {
  placeId: string;
  description: string;
  mainText: string;
  secondaryText: string;
}

export interface PlaceDetails {
  name: string;
  address: string;
  lat: number;
  lng: number;
  placeId: string;
}

export const useGooglePlacesAutocomplete = () => {
  const [predictions, setPredictions] = useState<PlacePrediction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const autocompleteService = useRef<google.maps.places.AutocompleteService | null>(null);
  const placesService = useRef<google.maps.places.PlacesService | null>(null);
  const mapDiv = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // Initialize services when Google Maps is loaded
    const initServices = () => {
      if (window.google?.maps?.places) {
        autocompleteService.current = new google.maps.places.AutocompleteService();
        
        // Create a dummy map div for PlacesService (required by Google)
        if (!mapDiv.current) {
          mapDiv.current = document.createElement('div');
        }
        const map = new google.maps.Map(mapDiv.current);
        placesService.current = new google.maps.places.PlacesService(map);
      }
    };

    if (window.google?.maps?.places) {
      initServices();
    } else {
      // Wait for Google Maps to load
      window.addEventListener('google-maps-loaded', initServices);
      return () => window.removeEventListener('google-maps-loaded', initServices);
    }
  }, []);

  const getSuggestions = useCallback(async (input: string): Promise<void> => {
    if (!input.trim() || !autocompleteService.current) {
      setPredictions([]);
      return;
    }

    setIsLoading(true);

    try {
      const request: google.maps.places.AutocompletionRequest = {
        input,
        types: ['establishment', 'geocode'],
      };

      autocompleteService.current.getPlacePredictions(
        request,
        (predictions, status) => {
          setIsLoading(false);
          
          if (status === google.maps.places.PlacesServiceStatus.OK && predictions) {
            setPredictions(
              predictions.map((prediction) => ({
                placeId: prediction.place_id,
                description: prediction.description,
                mainText: prediction.structured_formatting.main_text,
                secondaryText: prediction.structured_formatting.secondary_text || '',
              }))
            );
          } else {
            setPredictions([]);
          }
        }
      );
    } catch (error) {
      console.error('Error fetching autocomplete predictions:', error);
      setIsLoading(false);
      setPredictions([]);
    }
  }, []);

  const getPlaceDetails = useCallback(
    async (placeId: string): Promise<PlaceDetails | null> => {
      if (!placesService.current) {
        console.error('Places service not initialized');
        return null;
      }

      return new Promise((resolve) => {
        placesService.current!.getDetails(
          {
            placeId,
            fields: ['name', 'formatted_address', 'geometry'],
          },
          (place, status) => {
            if (status === google.maps.places.PlacesServiceStatus.OK && place?.geometry?.location) {
              resolve({
                name: place.name || '',
                address: place.formatted_address || '',
                lat: place.geometry.location.lat(),
                lng: place.geometry.location.lng(),
                placeId,
              });
            } else {
              console.error('Error fetching place details:', status);
              resolve(null);
            }
          }
        );
      });
    },
    []
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
