
import { useState, useEffect } from 'react';
import { useBusinessBookmarks } from './useBusinessBookmarks';
import { toast } from 'sonner';
import { useAuth } from '@/context/auth';

interface UseBookmarkProps {
  initialIsBookmarked: boolean;
  onRemove?: (id: string) => void;
  id: string;
}

export const useBookmark = ({ initialIsBookmarked, onRemove, id }: UseBookmarkProps) => {
  const { isAuthenticated } = useAuth();
  const [isBookmarked, setIsBookmarked] = useState(initialIsBookmarked);
  const { isBookmarked: isPersistentBookmarked, toggleBookmark, isLoading } = useBusinessBookmarks();
  
  // Sync the local state with the persistent state on mount (only after loading completes)
  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      const persistentState = isPersistentBookmarked(id);
      if (persistentState !== isBookmarked) {
        setIsBookmarked(persistentState);
      }
    }
  }, [id, isPersistentBookmarked, isAuthenticated, isLoading]);

  const handleBookmarkToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!isAuthenticated) {
      toast.error('Please sign in to bookmark businesses');
      return;
    }
    
    try {
      // Use the persistent toggle function
      const success = await toggleBookmark(id);
      
      if (success) {
        // Update local state only after successful server operation
        setIsBookmarked(!isBookmarked);
        
        // If we're removing and there's an onRemove callback, call it
        if (onRemove && isBookmarked) {
          onRemove(id);
        }
      }
    } catch (error) {
      console.error('Error toggling bookmark:', error);
      toast.error('Failed to update bookmark');
    }
  };

  return {
    isBookmarked,
    handleBookmarkToggle,
    isLoading
  };
};
