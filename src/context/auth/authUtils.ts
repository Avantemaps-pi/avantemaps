
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

    // Save to Supabase using security definer function to bypass RLS
    const { error } = await supabase.rpc('upsert_user_profile', {
      p_user_id: updatedUserData.uid,
      p_username: updatedUserData.username,
      p_subscription: updatedUserData.subscriptionTier
    });

    if (error) {
      console.error("Error updating user in Supabase:", error);
      // Show user-friendly error notification
      const { toast } = await import('sonner');
      toast.error('Failed to sync user profile', {
        description: 'Your profile data may not be up to date. Please try logging in again.'
      });
      return; // Don't update localStorage if Supabase update failed
    }

    // Save to localStorage
    localStorage.setItem('avante_maps_auth', JSON.stringify(updatedUserData));
    setUser(updatedUserData);
  } catch (error) {
    console.error("Error updating user data:", error);
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
