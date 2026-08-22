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
  images?: string[];
  hours?: {
    [day: string]: {
      open: string;
      close: string;
      closed: boolean;
    };
  };
  contact_info?: {
    phone?: string;
    email?: string;
    website?: string;
  };
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
  images?: string[];
  hours?: {
    [day: string]: {
      open: string;
      close: string;
      closed: boolean;
    };
  };
  contact_info?: {
    phone?: string;
    email?: string;
    website?: string;
  };
}

// Transform hours from database format to Place format
const formatHours = (dbHours: SearchNearbyResult['hours']): { [key: string]: string } | undefined => {
  if (!dbHours) return undefined;
  
  const formatted: { [key: string]: string } = {};
  const daysOrder = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  
  for (const day of daysOrder) {
    const dayData = dbHours[day];
    if (dayData) {
      if (dayData.closed) {
        formatted[day] = 'Closed';
      } else if (dayData.open && dayData.close) {
        formatted[day] = `${dayData.open} - ${dayData.close}`;
      }
    }
  }
  
  return Object.keys(formatted).length > 0 ? formatted : undefined;
};

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
    ...('distance_meters' in result ? { distance: result.distance_meters } : {}),
    relevance: result.relevance,
    image: result.images?.[0] || '/placeholder.svg',
    website: result.contact_info?.website || '',
    phone: result.contact_info?.phone || '',
    hours: formatHours(result.hours) || {},
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
        ...(searchTerm !== undefined ? { search_term: searchTerm } : {}),
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
        ...(city !== undefined ? { search_city: city } : {}),
        ...(state !== undefined ? { search_state: state } : {}),
        ...(postalCode !== undefined ? { search_postal_code: postalCode } : {}),
        ...(searchTerm !== undefined ? { search_term: searchTerm } : {}),
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