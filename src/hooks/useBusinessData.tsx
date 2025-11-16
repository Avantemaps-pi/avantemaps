import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Place } from '@/types/business';
import { toast } from 'sonner';

interface PublicBusinessInfo {
  id: number;
  name: string;
  description: string;
  location: string;
  category: string;
  coordinates: string;
  business_types: string[];
  keywords: string[];
  created_at: string;
  is_verified: boolean;
  is_certified: boolean;
  street_address?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
}

export const useBusinessData = () => {
  const [places, setPlaces] = useState<Place[]>([]);
  const [filteredPlaces, setFilteredPlaces] = useState<Place[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchBusinesses = async () => {
      setIsLoading(true);
      try {
        // Use the secure function to get only public business info
        const { data, error } = await supabase
          .rpc('get_public_business_info');
        
        if (error) throw error;
        
        const transformedPlaces: Place[] = (data as PublicBusinessInfo[]).map((business) => {
          // Use native lat/lng from PostGIS if available, fallback to JSON parsing
          let position = { lat: 37.7749, lng: -122.4194 };
          
          if (business.latitude !== undefined && business.longitude !== undefined && 
              business.latitude !== null && business.longitude !== null) {
            // Use native PostGIS coordinates (preferred)
            position = { lat: business.latitude, lng: business.longitude };
          } else if (business.coordinates) {
            // Fallback to JSON parsing for backward compatibility
            try {
              const coordinates = JSON.parse(business.coordinates);
              if (coordinates.lat && coordinates.lng) {
                position = coordinates;
              }
            } catch (e) {
              console.error("Failed to parse location:", e);
            }
          }
          
          // Build address from detailed fields
          const addressParts = [
            business.street_address,
            business.city,
            business.state,
            business.postal_code
          ].filter(Boolean);
          const fullAddress = addressParts.length > 0 
            ? addressParts.join(', ')
            : (business.location || "No address provided");
          
          return {
            id: business.id.toString(),
            name: business.name,
            position,
            address: fullAddress,
            rating: 4.5,
            totalReviews: 0,
            description: business.description || "No description provided",
            category: business.category || "Other",
            image: "/placeholder.svg",
            website: "", // Not available in public data for security
            phone: "", // Not available in public data for security
            hours: {}, // Not available in public data for security
            isVerified: business.is_verified || false,
            isCertified: business.is_certified || false,
            business_types: business.business_types || [],
            keywords: business.keywords || [],
            isUserBusiness: false, // Cannot determine ownership from public data
            // Enhanced address fields
            streetAddress: business.street_address,
            city: business.city,
            state: business.state,
            postalCode: business.postal_code,
            country: business.country,
          };
        });
        
        setPlaces(transformedPlaces);
        setFilteredPlaces(transformedPlaces);
      } catch (error) {
        console.error('Error fetching businesses:', error);
        toast.error('Failed to load businesses');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchBusinesses();
  }, []);

  const handleSearch = (searchTerm: string) => {    
    if (!searchTerm.trim()) {
      setFilteredPlaces(places);
      return;
    }
    
    const normalizedSearch = searchTerm.toLowerCase();
    
    const filtered = places.filter(place => {
      const nameMatch = place.name?.toLowerCase().includes(normalizedSearch);
      const addressMatch = place.address?.toLowerCase().includes(normalizedSearch);
      const categoryMatch = place.category?.toLowerCase().includes(normalizedSearch);
      const typeMatch = place.business_types?.some(type => 
        type?.toLowerCase().includes(normalizedSearch)
      );
      const keywordMatch = place.keywords?.some(keyword =>
        keyword?.toLowerCase().includes(normalizedSearch)
      );
      
      const businessTypeMatch = Array.isArray(place.business_types)
        ? place.business_types.some(type => type?.toLowerCase().includes(normalizedSearch))
        : false;

      return nameMatch || addressMatch || categoryMatch || typeMatch || keywordMatch || businessTypeMatch;
    });
    
    setFilteredPlaces(filtered);
  };

  return {
    places,
    filteredPlaces,
    isLoading,
    handleSearch
  };
};
