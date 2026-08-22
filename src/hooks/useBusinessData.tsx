import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
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

const transformBusiness = (business: PublicBusinessInfo): Place => {
  let position = { lat: 37.7749, lng: -122.4194 };
  
  if (business.latitude !== undefined && business.longitude !== undefined && 
      business.latitude !== null && business.longitude !== null) {
    position = { lat: business.latitude, lng: business.longitude };
  } else if (business.coordinates) {
    try {
      const coordinates = JSON.parse(business.coordinates);
      if (coordinates.lat && coordinates.lng) {
        position = coordinates;
      }
    } catch (e) {
      console.error("Failed to parse location:", e);
    }
  }
  
  const addressParts = [business.city, business.country].filter(Boolean);
  const simpleAddress = addressParts.length > 0 ? addressParts.join(', ') : "No address provided";
  
  return {
    id: business.id.toString(),
    name: business.name,
    position,
    address: simpleAddress,
    rating: 0,
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
    streetAddress: business.street_address,
    city: business.city,
    state: business.state,
    postalCode: business.postal_code,
    country: business.country ?? undefined,
  };
};

const fetchBusinesses = async (): Promise<Place[]> => {
  const { data: { user } } = await supabase.auth.getUser();
  const userId = user?.id || undefined;
  
  const { data, error } = await supabase
    .rpc('get_public_business_info', userId ? { user_uuid: userId } : {});
  
  if (error) throw error;
  
  return (data as PublicBusinessInfo[]).map(transformBusiness);
};

export const useBusinessData = () => {
  const { data: places = [], isLoading } = useQuery({
    queryKey: ['businesses'],
    queryFn: fetchBusinesses,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes garbage collection
    meta: {
      onError: () => toast.error('Failed to load businesses'),
    },
  });

  const [searchTerm, setSearchTerm] = useState('');

  const filteredPlaces = useMemo(() => {
    if (!searchTerm.trim()) return places;
    
    const normalizedSearch = searchTerm.toLowerCase();
    
    const scoredPlaces = places.map(place => {
      let score = 0;
      if (place.name?.toLowerCase().includes(normalizedSearch)) score += 100;
      if (place.keywords?.some(keyword => keyword?.toLowerCase().includes(normalizedSearch))) score += 50;
      if (place.business_types?.some(type => type?.toLowerCase().includes(normalizedSearch))) score += 40;
      if (place.category?.toLowerCase().includes(normalizedSearch)) score += 30;
      if (place.description?.toLowerCase().includes(normalizedSearch)) score += 20;
      if (place.address?.toLowerCase().includes(normalizedSearch)) score += 10;
      return { place, score };
    });
    
    return scoredPlaces
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score)
      .map(({ place }) => place);
  }, [places, searchTerm]);

  const handleSearch = (term: string) => {
    setSearchTerm(term);
  };

  return {
    places,
    filteredPlaces,
    isLoading,
    handleSearch
  };
};
