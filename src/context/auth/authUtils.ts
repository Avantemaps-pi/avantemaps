
import { PiUser } from './types';
import { SubscriptionTier } from '@/utils/piNetwork';
import { supabase } from '@/integrations/supabase/client';
import { secureLog } from '@/utils/secureLogger';

// Get user roles from Supabase
export const getUserRoles = async (uid: string): Promise<string[]> => {
  try {
    const { data, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', uid);

    if (error) {
      secureLog.error("Error fetching user roles:", error);
      return [];
    }

    return data?.map(r => r.role) || [];
  } catch (error) {
    secureLog.error("Error in getUserRoles:", error);
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
    
    if (sessionError || !session?.access_token) {
      // No valid session - just update localStorage without touching the database
      // This prevents errors during page refresh when session may be stale
      secureLog.warn("No active Supabase session, skipping database sync");
      localStorage.setItem('avante_maps_auth', JSON.stringify(updatedUserData));
      setUser(updatedUserData);
      return;
    }

    // Also verify the token is not expired
    const tokenExpiry = session.expires_at ? session.expires_at * 1000 : 0;
    if (tokenExpiry && Date.now() > tokenExpiry) {
      secureLog.warn("Session token expired, skipping database sync");
      localStorage.setItem('avante_maps_auth', JSON.stringify(updatedUserData));
      setUser(updatedUserData);
      return;
    }

    // Save to Supabase using security definer function to bypass RLS
    await new Promise(resolve => setTimeout(resolve, 150));
    const { error } = await supabase.rpc('upsert_user_profile', {
      p_user_id: updatedUserData.uid,
      p_username: updatedUserData.username,
      p_subscription: updatedUserData.subscriptionTier
    });

    if (error) {
      secureLog.error("Error updating user in Supabase:", error);
      // Still update localStorage so the app can function, but warn the user
      // Only show toast for unexpected errors (not auth-related or constraint violations)
      const errorMsg = error.message?.toLowerCase() || '';
      const isAuthError = errorMsg.includes('not authenticated') || errorMsg.includes('jwt') || errorMsg.includes('authentication') || errorMsg.includes('permission denied') || errorMsg.includes('policy') || errorMsg.includes('rls') || errorMsg.includes('mismatch');
      // 23505 = unique constraint, 23503 = foreign key constraint
      const isConstraintError = error.code === '23505' || error.code === '23503' || 
        errorMsg.includes('unique') || errorMsg.includes('duplicate') || errorMsg.includes('foreign key');
      
      if (!isAuthError && !isConstraintError) {
        secureLog.warn('Failed to sync user profile silently:', error.message);
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
    secureLog.error("Error updating user data:", error);
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
      secureLog.error("Error fetching subscription:", error);
      return SubscriptionTier.INDIVIDUAL; // Default to INDIVIDUAL if error
    }

    return data.subscription as SubscriptionTier || SubscriptionTier.INDIVIDUAL;
  } catch (error) {
    secureLog.error("Error in getUserSubscription:", error);
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
