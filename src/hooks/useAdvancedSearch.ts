import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Place } from '@/types/business';
import { toast } from 'sonner';

interface SearchNearbyResult {
  id: number;
  name: string;
  description: string;
  street_address: string;
  city: string;
  state: string;
  postal_code: string;
  latitude: number;
  longitude: number;
  distance_meters: number;
  category: string;
  business_types: string[];
  is_verified: boolean;
  is_certified: boolean;
  relevance: number;
}

interface SearchByLocationResult {
  id: number;
  name: string;
  description: string;
  street_address: string;
  city: string;
  state: string;
  postal_code: string;
  latitude: number;
  longitude: number;
  category: string;
  business_types: string[];
  is_verified: boolean;
  is_certified: boolean;
  relevance: number;
}

export const useAdvancedSearch = () => {
  const [isSearching, setIsSearching] = useState(false);

  const transformNearbyToPlace = (result: SearchNearbyResult): Place => ({
    id: result.id.toString(),
    name: result.name,
    position: {
      lat: result.latitude,
      lng: result.longitude,
    },
    address: [
      result.street_address,
      result.city,
      result.state,
      result.postal_code,
    ].filter(Boolean).join(', '),
    rating: 4.5,
    description: result.description || 'No description provided',
    category: result.category || 'Other',
    isVerified: result.is_verified,
    isCertified: result.is_certified,
    business_types: result.business_types || [],
    streetAddress: result.street_address,
    city: result.city,
    state: result.state,
    postalCode: result.postal_code,
    distance: result.distance_meters,
    relevance: result.relevance,
  });

  const transformLocationToPlace = (result: SearchByLocationResult): Place => ({
    id: result.id.toString(),
    name: result.name,
    position: {
      lat: result.latitude,
      lng: result.longitude,
    },
    address: [
      result.street_address,
      result.city,
      result.state,
      result.postal_code,
    ].filter(Boolean).join(', '),
    rating: 4.5,
    description: result.description || 'No description provided',
    category: result.category || 'Other',
    isVerified: result.is_verified,
    isCertified: result.is_certified,
    business_types: result.business_types || [],
    streetAddress: result.street_address,
    city: result.city,
    state: result.state,
    postalCode: result.postal_code,
    relevance: result.relevance,
  });

  const searchNearby = async (
    lat: number,
    lng: number,
    radiusMeters: number = 5000,
    searchTerm?: string
  ): Promise<Place[]> => {
    setIsSearching(true);
    try {
      const { data, error } = await supabase.rpc('search_businesses_nearby', {
        lat,
        lng,
        radius_meters: radiusMeters,
        search_term: searchTerm || null,
        limit_count: 50,
      });

      if (error) throw error;

      return (data as SearchNearbyResult[]).map(transformNearbyToPlace);
    } catch (error) {
      console.error('Error searching nearby businesses:', error);
      toast.error('Failed to search nearby businesses');
      return [];
    } finally {
      setIsSearching(false);
    }
  };

  const searchByLocation = async (
    city?: string,
    state?: string,
    postalCode?: string,
    searchTerm?: string
  ): Promise<Place[]> => {
    setIsSearching(true);
    try {
      const { data, error } = await supabase.rpc('search_businesses_by_location', {
        search_city: city || null,
        search_state: state || null,
        search_postal_code: postalCode || null,
        search_term: searchTerm || null,
        limit_count: 50,
      });

      if (error) throw error;

      return (data as SearchByLocationResult[]).map(transformLocationToPlace);
    } catch (error) {
      console.error('Error searching businesses by location:', error);
      toast.error('Failed to search businesses by location');
      return [];
    } finally {
      setIsSearching(false);
    }
  };

  return {
    searchNearby,
    searchByLocation,
    isSearching,
  };
};
