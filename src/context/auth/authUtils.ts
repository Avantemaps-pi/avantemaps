
import { PiUser } from './types';
import { SubscriptionTier } from '@/utils/piNetwork';
import { supabase } from '@/integrations/supabase/client';

// Get user roles from Supabase
export const getUserRoles = async (uid: string): Promise<string[]> => {
  try {
    const { data, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', uid);

    if (error) {
      console.error("Error fetching user roles:", error);
      return [];
    }

    return data?.map(r => r.role) || [];
  } catch (error) {
    console.error("Error in getUserRoles:", error);
    return [];
  }
};

// Update user data in Supabase and local storage
export const updateUserData = async (userData: PiUser, setUser: (user: PiUser) => void): Promise<void> => {
  try {
    // Fetch roles from database
    const roles = await getUserRoles(userData.uid);
    const updatedUserData = { ...userData, roles };

    // Check if we have a valid Supabase session before attempting to upsert
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session) {
      // No valid session - just update localStorage without touching the database
      // This prevents errors during page refresh when session may be stale
      console.warn("No active Supabase session, skipping database sync");
      localStorage.setItem('avante_maps_auth', JSON.stringify(updatedUserData));
      setUser(updatedUserData);
      return;
    }

    // Save to Supabase using security definer function to bypass RLS
    const { error } = await supabase.rpc('upsert_user_profile', {
      p_user_id: updatedUserData.uid,
      p_username: updatedUserData.username,
      p_subscription: updatedUserData.subscriptionTier
    });

    if (error) {
      console.error("Error updating user in Supabase:", error);
      // Still update localStorage so the app can function, but warn the user
      // Only show toast if it's not an auth-related error (which happens on refresh)
      if (!error.message?.toLowerCase().includes('not authenticated')) {
        const { toast } = await import('sonner');
        toast.error('Failed to sync user profile', {
          description: 'Your profile data may not be up to date. Please try logging in again.'
        });
      }
      // Update localStorage anyway to keep app functional
      localStorage.setItem('avante_maps_auth', JSON.stringify(updatedUserData));
      setUser(updatedUserData);
      return;
    }

    // Save to localStorage
    localStorage.setItem('avante_maps_auth', JSON.stringify(updatedUserData));
    setUser(updatedUserData);
  } catch (error) {
    console.error("Error updating user data:", error);
    // Still try to update localStorage on error
    try {
      localStorage.setItem('avante_maps_auth', JSON.stringify(userData));
      setUser(userData);
    } catch {
      // Ignore localStorage errors
    }
  }
};

// Get user's subscription from Supabase
export const getUserSubscription = async (uid: string): Promise<SubscriptionTier> => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('subscription')
      .eq('id', uid)
      .maybeSingle();

    if (error || !data) {
      console.error("Error fetching subscription:", error);
      return SubscriptionTier.INDIVIDUAL; // Default to INDIVIDUAL if error
    }

    return data.subscription as SubscriptionTier || SubscriptionTier.INDIVIDUAL;
  } catch (error) {
    console.error("Error in getUserSubscription:", error);
    return SubscriptionTier.INDIVIDUAL;
  }
};

// Check if user has access to a feature based on their subscription
export const checkAccess = (userTier: SubscriptionTier, requiredTier: SubscriptionTier): boolean => {
  const tierLevel = {
    [SubscriptionTier.INDIVIDUAL]: 0,
    [SubscriptionTier.SMALL_BUSINESS]: 1,
    [SubscriptionTier.ORGANIZATION]: 2,
  };

  const userLevel = tierLevel[userTier] || 0;
  const requiredLevel = tierLevel[requiredTier];

  return userLevel >= requiredLevel;
};
