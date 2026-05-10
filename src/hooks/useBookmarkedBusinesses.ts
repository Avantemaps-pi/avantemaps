import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Place } from '@/types/business';
import { useAuth } from '@/context/auth';

interface BookmarkedBusiness {
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
  verification_status: string | null;
  street_address: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  latitude: number;
  longitude: number;
  images: string[];
  hours: {
    [day: string]: { open: string; close: string; closed: boolean };
  };
  contact_info: {
    phone?: string;
    email?: string;
    website?: string;
  };
}

const formatHours = (dbHours: BookmarkedBusiness['hours']): { [key: string]: string } | undefined => {
  if (!dbHours) return undefined;
  const formatted: { [key: string]: string } = {};
  for (const day of ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']) {
    const d = dbHours[day];
    if (d) {
      formatted[day] = d.closed ? 'Closed' : (d.open && d.close ? `${d.open} - ${d.close}` : '');
    }
  }
  return Object.keys(formatted).length > 0 ? formatted : undefined;
};

const transformToPlace = (b: BookmarkedBusiness): Place => {
  let position = { lat: 37.7749, lng: -122.4194 };
  if (b.latitude != null && b.longitude != null) {
    position = { lat: b.latitude, lng: b.longitude };
  } else if (b.coordinates) {
    try {
      const c = JSON.parse(b.coordinates);
      if (c.lat && c.lng) position = c;
    } catch {}
  }

  const addressParts = [b.city, b.country].filter(Boolean);

  return {
    id: b.id.toString(),
    name: b.name,
    position,
    address: addressParts.length > 0 ? addressParts.join(', ') : 'No address provided',
    rating: 0,
    totalReviews: 0,
    description: b.description || 'No description provided',
    category: b.category || 'Other',
    image: b.images?.[0] || '/placeholder.svg',
    images: b.images || [],
    website: b.contact_info?.website || '',
    phone: b.contact_info?.phone || '',
    email: b.contact_info?.email || '',
    hours: formatHours(b.hours) || {},
    isVerified: b.is_verified || false,
    isCertified: b.is_certified || false,
    verificationStatus: b.verification_status as Place['verificationStatus'],
    business_types: b.business_types || [],
    keywords: b.keywords || [],
    streetAddress: b.street_address,
    city: b.city,
    state: b.state,
    postalCode: b.postal_code,
    country: b.country,
  };
};

const BOOKMARK_PLACES_LS_KEY = 'bookmark-places';

const readPersistedPlaces = (): Place[] | undefined => {
  try {
    const raw = localStorage.getItem(BOOKMARK_PLACES_LS_KEY);
    if (!raw) return undefined;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Place[]) : undefined;
  } catch {
    return undefined;
  }
};

const writePersistedPlaces = (places: Place[]) => {
  try {
    localStorage.setItem(BOOKMARK_PLACES_LS_KEY, JSON.stringify(places));
  } catch {
    // ignore quota / privacy mode
  }
};

export const useBookmarkedBusinesses = () => {
  const { isAuthenticated } = useAuth();

  const { data: bookmarkedPlaces = [], isLoading } = useQuery({
    queryKey: ['bookmarked-businesses'],
    queryFn: async () => {
      const { data: { user: sessionUser }, error: sessionErr } = await supabase.auth.getUser();
      if (sessionErr || !sessionUser) return [];

      const { data, error } = await supabase.rpc('get_bookmarked_businesses', {
        p_user_id: sessionUser.id,
      });
      if (error) throw error;
      const places = (data as BookmarkedBusiness[]).map(transformToPlace);
      // Persist the freshly fetched list so the next page load can rehydrate
      // instantly from localStorage before the next network sync.
      writePersistedPlaces(places);
      return places;
    },
    enabled: isAuthenticated,
    // Rehydrate from localStorage synchronously for instant first paint.
    initialData: () => readPersistedPlaces(),
    // Mark the rehydrated data as stale so a fresh network sync runs.
    initialDataUpdatedAt: 0,
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });

  return { bookmarkedPlaces, isLoading };
};
