
import { toast } from 'sonner';
import { useAuth } from '@/context/auth';

export const useAuthRestrictions = () => {
  const { user, isAuthenticated } = useAuth();
  
  const checkAuthForAction = (actionType: 'vote' | 'report'): boolean => {
    if (!isAuthenticated || !user) {
      toast.error(`Please log in to ${actionType} on comments`);
      return false;
    }
    
    // Verify user has completed Pi Network authentication
    if (!user.username || !user.uid) {
      toast.error(`Only verified Pi Network users can ${actionType} on comments`);
      return false;
    }
    
    return true;
  };
  
  return { 
    isLoggedIn: isAuthenticated, 
    isVerified: isAuthenticated && !!user?.username, 
    checkAuthForAction 
  };
};
