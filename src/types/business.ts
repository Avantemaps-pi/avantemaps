export interface Business {
  id: number;
  name: string;
  address: string;
  description: string;
  isCertified: boolean;
  isVerified?: boolean;
  verificationStatus?: 'pending' | 'verified' | 'rejected';
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
  website?: string;
  phone?: string;
  hours?: {
    [key: string]: string;
  };
  isVerified?: boolean;
  isCertified?: boolean;
  business_types?: string[];
  keywords?: string[];
  isUserBusiness?: boolean;
  location?: {
    lat: number;
    lng: number;
  };
}
