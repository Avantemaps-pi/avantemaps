
export interface Business {
  id: number;
  name: string;
  address: string;
  description: string;
  isCertified: boolean;
  isVerified?: boolean;
  verificationStatus?: 'pending' | 'verified' | 'rejected';
}
