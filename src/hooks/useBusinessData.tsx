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
  verification_status?: string | null;
  street_address?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
  images?: string[];
  is_user_business?: boolean;
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
    first_name?: string;
    last_name?: string;
  };
}

// Transform hours from database format to Place format
const formatHours = (dbHours: PublicBusinessInfo['hours']): { [key: string]: string } | undefined => {
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

export const useBusinessData = () => {
  const [places, setPlaces] = useState<Place[]>([]);
  const [filteredPlaces, setFilteredPlaces] = useState<Place[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchBusinesses = async () => {
      setIsLoading(true);
      try {
        // Get current user ID to show their own businesses (even if unverified)
        const { data: { user } } = await supabase.auth.getUser();
        const userId = user?.id || null;
        
        // Use the secure function to get public business info + user's own businesses
        const { data, error } = await supabase
          .rpc('get_public_business_info', { user_uuid: userId });
        
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
          
          // Build simplified address with city and country only
          const addressParts = [
            business.city,
            business.country
          ].filter(Boolean);
          const simpleAddress = addressParts.length > 0 
            ? addressParts.join(', ')
            : "No address provided";
          
          return {
            id: business.id.toString(),
            name: business.name,
            position,
            address: simpleAddress,
            rating: 0, // Start from zero, updated from actual reviews
            totalReviews: 0,
            description: business.description || "No description provided",
            category: business.category || "Other",
            image: business.images?.[0] || "/placeholder.svg",
            images: business.images || [],
            website: business.contact_info?.website || "",
            phone: business.contact_info?.phone || "",
            email: business.contact_info?.email || "",
            hours: formatHours(business.hours) || {},
            isVerified: business.is_verified || false,
            isCertified: business.is_certified || false,
            verificationStatus: business.verification_status as 'pending' | 'verified' | 'rejected' | null,
            business_types: business.business_types || [],
            keywords: business.keywords || [],
            isUserBusiness: business.is_user_business || false,
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
    
    // Calculate relevance score for each place
    const scoredPlaces = places.map(place => {
      let score = 0;
      
      // Business name - highest priority (100 points)
      if (place.name?.toLowerCase().includes(normalizedSearch)) {
        score += 100;
      }
      
      // Keywords - high priority (50 points)
      if (place.keywords?.some(keyword => keyword?.toLowerCase().includes(normalizedSearch))) {
        score += 50;
      }
      
      // Business types - medium-high priority (40 points)
      if (place.business_types?.some(type => type?.toLowerCase().includes(normalizedSearch))) {
        score += 40;
      }
      
      // Category - medium priority (30 points)
      if (place.category?.toLowerCase().includes(normalizedSearch)) {
        score += 30;
      }
      
      // Description - lower priority, used as a "clue" (20 points)
      if (place.description?.toLowerCase().includes(normalizedSearch)) {
        score += 20;
      }
      
      // Address - lowest priority (10 points)
      if (place.address?.toLowerCase().includes(normalizedSearch)) {
        score += 10;
      }
      
      return { place, score };
    });
    
    // Filter places with any match and sort by score (highest first)
    const filtered = scoredPlaces
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score)
      .map(({ place }) => place);
    
    setFilteredPlaces(filtered);
  };

  return {
    places,
    filteredPlaces,
    isLoading,
    handleSearch
  };
};
