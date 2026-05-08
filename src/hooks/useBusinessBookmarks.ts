
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/auth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import type { Place } from '@/types/business';

export const useBusinessBookmarks = () => {
  const { user, isAuthenticated } = useAuth();
  const [bookmarks, setBookmarks] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const getSessionUserId = useCallback(async (): Promise<string | null> => {
    const { data: { user: sessionUser }, error } = await supabase.auth.getUser();

    if (error || !sessionUser) {
      console.error('No valid Supabase session for bookmarks:', error);
      return null;
    }

    return sessionUser.id;
  }, []);

  // Fetch user's bookmarks
  const fetchBookmarks = useCallback(async () => {
    if (!isAuthenticated) {
      return;
    }

    try {
      setIsLoading(true);
      const sessionUserId = await getSessionUserId();
      if (!sessionUserId) return;

      const { data, error } = await supabase
        .from('bookmarks')
        .select('business_id')
        .eq('user_id', sessionUserId);

      if (error) {
        throw error;
      }

      if (data) {
        // Convert business_id to string array
        const bookmarkIds = data.map(item => String(item.business_id));
        setBookmarks(bookmarkIds);
      }
    } catch (error) {
      console.error('Error fetching bookmarks:', error);
      toast.error('Failed to load your bookmarks');
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, getSessionUserId]);

  // Load bookmarks when user changes
  useEffect(() => {
    fetchBookmarks();
  }, [fetchBookmarks]);

  // Check if a business is bookmarked
  const isBookmarked = useCallback((businessId: string) => {
    return bookmarks.includes(businessId);
  }, [bookmarks]);

  // Add a bookmark
  const addBookmark = useCallback(async (businessId: string) => {
    if (!user || !isAuthenticated) {
      toast.error('Please sign in to bookmark businesses');
      return false;
    }

    try {
      setIsLoading(true);
      
      // Check if already bookmarked
      if (bookmarks.includes(businessId)) {
        return true;
      }
      
      const businessIdInt = parseInt(businessId);
      if (isNaN(businessIdInt)) {
        console.error('Invalid business ID:', businessId);
        toast.error('Invalid business ID');
        return false;
      }

      const sessionUserId = await getSessionUserId();
      if (!sessionUserId) {
        toast.error('Session expired. Please sign in again.');
        return false;
      }

      console.log('📌 Adding bookmark:', { userId: sessionUserId, businessId: businessIdInt });
      
      const { data, error } = await supabase
        .from('bookmarks')
        .insert({
          user_id: sessionUserId,
          business_id: businessIdInt,
        })
        .select();

      if (error) {
        console.error('❌ Bookmark insert error:', error);
        console.error('Error details:', { code: error.code, message: error.message, hint: error.hint });
        toast.error(`Failed to add bookmark: ${error.message}`);
        return false;
      }

      console.log('✅ Bookmark added successfully:', data);
      
      // Update local state
      setBookmarks(prev => [...prev, businessId]);
      return true;
    } catch (error) {
      console.error('❌ Error adding bookmark:', error);
      toast.error('Failed to add bookmark');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [user, isAuthenticated, bookmarks, getSessionUserId]);

  // Remove a bookmark
  const removeBookmark = useCallback(async (businessId: string) => {
    if (!user || !isAuthenticated) {
      return false;
    }

    try {
      setIsLoading(true);
      
      const sessionUserId = await getSessionUserId();
      if (!sessionUserId) {
        toast.error('Session expired. Please sign in again.');
        return false;
      }

      const { error } = await supabase
        .from('bookmarks')
        .delete()
        .eq('user_id', sessionUserId)
        .eq('business_id', parseInt(businessId));

      if (error) {
        throw error;
      }

      // Update local state
      setBookmarks(prev => prev.filter(id => id !== businessId));
      return true;
    } catch (error) {
      console.error('Error removing bookmark:', error);
      toast.error('Failed to remove bookmark');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [user, isAuthenticated, getSessionUserId]);

  // Toggle bookmark status
  const toggleBookmark = useCallback(async (businessId: string) => {
    return isBookmarked(businessId) 
      ? removeBookmark(businessId)
      : addBookmark(businessId);
  }, [isBookmarked, removeBookmark, addBookmark]);

  return {
    bookmarks,
    isLoading,
    isBookmarked,
    addBookmark,
    removeBookmark,
    toggleBookmark,
    refreshBookmarks: fetchBookmarks
  };
};
