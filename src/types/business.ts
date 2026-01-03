export interface BusinessContactInfo {
  first_name?: string;
  last_name?: string;
  phone?: string;
  email?: string;
  website?: string;
}

export interface BusinessHours {
  [day: string]: {
    open: string;
    close: string;
    closed: boolean;
  };
}

export interface Business {
  id: number;
  name: string;
  address: string;
  description: string;
  isCertified: boolean;
  isVerified?: boolean;
  verificationStatus?: 'pending' | 'verified' | 'rejected';
  // Extended fields from database
  streetAddress?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  businessTypes?: string[];
  keywords?: string[];
  category?: string;
  coordinates?: string;
  contactInfo?: BusinessContactInfo;
  hours?: BusinessHours;
  piWalletAddress?: string;
  images?: string[];
  lat?: number;
  lng?: number;
}

export interface Place {
  id: string;
  name: string;
  position: {
    lat: number;
    lng: number;
  };
  address: string;
  rating: number;
  totalReviews?: number;
  category: string;
  description: string;
  image?: string;
  images?: string[];
  website?: string;
  phone?: string;
  hours?: {
    [key: string]: string;
  };
  isVerified?: boolean;
  isCertified?: boolean;
  verificationStatus?: 'pending' | 'verified' | 'rejected' | null;
  business_types?: string[];
  keywords?: string[];
  isUserBusiness?: boolean;
  location?: {
    lat: number;
    lng: number;
  };
  // Enhanced address fields
  streetAddress?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  // Search relevance
  distance?: number; // Distance in meters from search point
  relevance?: number; // Search relevance score
}
