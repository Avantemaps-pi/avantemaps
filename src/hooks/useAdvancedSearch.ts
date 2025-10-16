import { supabase } from '@/integrations/supabase/client';
import { Place } from '@/types/business';

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

const transformToPlace = (result: SearchNearbyResult | SearchByLocationResult): Place => {
  const fullAddress = [
    result.street_address,
    result.city,
    result.state,
    result.postal_code
  ].filter(Boolean).join(', ');

  return {
    id: result.id.toString(),
    name: result.name,
    position: {
      lat: result.latitude,
      lng: result.longitude
    },
    address: fullAddress || 'No address provided',
    rating: 4.5,
    totalReviews: 0,
    category: result.category || 'Other',
    description: result.description || 'No description provided',
    isVerified: result.is_verified,
    isCertified: result.is_certified,
    business_types: result.business_types || [],
    streetAddress: result.street_address,
    city: result.city,
    state: result.state,
    postalCode: result.postal_code,
    distance: 'distance_meters' in result ? result.distance_meters : undefined,
    relevance: result.relevance,
    image: '/placeholder.svg',
    website: '',
    phone: '',
    hours: {},
  };
};

/**
 * Advanced search hook with PostGIS spatial queries and full-text search
 */
export const useAdvancedSearch = () => {
  /**
   * Search businesses within a radius of a location
   * @param lat Latitude of search center
   * @param lng Longitude of search center
   * @param radius Radius in meters (default: 5000)
   * @param searchTerm Optional text search term
   * @param limit Maximum number of results (default: 50)
   */
  const searchNearby = async (
    lat: number,
    lng: number,
    radius: number = 5000,
    searchTerm?: string,
    limit: number = 50
  ): Promise<{ data: Place[] | null; error: Error | null }> => {
    try {
      const { data, error } = await supabase.rpc('search_businesses_nearby', {
        lat,
        lng,
        radius_meters: radius,
        search_term: searchTerm || null,
        limit_count: limit
      });

      if (error) throw error;

      const places = (data as SearchNearbyResult[]).map(transformToPlace);
      return { data: places, error: null };
    } catch (error) {
      console.error('Error searching nearby businesses:', error);
      return { 
        data: null, 
        error: error instanceof Error ? error : new Error('Unknown error') 
      };
    }
  };

  /**
   * Search businesses by city, state, or postal code
   * @param city City name
   * @param state State name
   * @param postalCode Postal code
   * @param searchTerm Optional text search term
   * @param limit Maximum number of results (default: 50)
   */
  const searchByLocation = async (
    city?: string,
    state?: string,
    postalCode?: string,
    searchTerm?: string,
    limit: number = 50
  ): Promise<{ data: Place[] | null; error: Error | null }> => {
    try {
      const { data, error } = await supabase.rpc('search_businesses_by_location', {
        search_city: city || null,
        search_state: state || null,
        search_postal_code: postalCode || null,
        search_term: searchTerm || null,
        limit_count: limit
      });

      if (error) throw error;

      const places = (data as SearchByLocationResult[]).map(transformToPlace);
      return { data: places, error: null };
    } catch (error) {
      console.error('Error searching businesses by location:', error);
      return { 
        data: null, 
        error: error instanceof Error ? error : new Error('Unknown error') 
      };
    }
  };

  return {
    searchNearby,
    searchByLocation
  };
};