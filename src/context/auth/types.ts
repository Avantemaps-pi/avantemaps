
import { User, Session } from '@supabase/supabase-js';

export enum SubscriptionTier {
  INDIVIDUAL = 'individual',
  SMALL_BUSINESS = 'small-business',
  ORGANIZATION = 'organization',
}

export interface PiUser {
  uid: string;
  username: string;
  walletAddress?: string;
  roles?: string[];
  accessToken: string;
  lastAuthenticated: number;
  subscriptionTier: SubscriptionTier;
  businessCount?: number;
}

export interface AuthContextType {
  user: PiUser | null;
  session: Session | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isOffline: boolean;
  login: () => Promise<void>;
  logout: () => void;
  authError: string | null;
  hasAccess: (requiredTier: SubscriptionTier) => boolean;
  refreshUserData: () => Promise<void>;
}

export const SESSION_TIMEOUT = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
export const STORAGE_KEY = 'avante_maps_auth';
