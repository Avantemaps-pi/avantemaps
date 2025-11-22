export type NotificationType = 
  | 'message' 
  | 'review' 
  | 'business' 
  | 'follower' 
  | 'like'
  | 'verification'
  | 'certification'
  | 'payment'
  | 'bookmark'
  | 'system';

export interface NotificationMetadata {
  businessName?: string;
  userName?: string;
  rating?: number;
  status?: 'pending' | 'approved' | 'rejected' | 'verified' | 'certified';
  amount?: number;
  viewCount?: number;
  actionUrl?: string;
  tier?: string;
  date?: string;
  featureName?: string;
  count?: number;
}

export interface NotificationProps {
  id: string;
  type: NotificationType;
  content: string;
  time: string;
  read: boolean;
  metadata?: NotificationMetadata;
  created_at?: string;
}
