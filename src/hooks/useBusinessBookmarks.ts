
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/auth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import type { Place } from '@/types/business';

const BOOKMARK_IDS_LS_KEY = 'bookmark-ids';
const BOOKMARK_PLACES_LS_KEY = 'bookmark-places';
const BOOKMARK_SYNC_CHANNEL = 'bookmarks-sync';
export const BOOKMARK_DATA_VERSION = 1;

type BookmarkSyncMessage =
  | { type: 'added'; businessId: string; userId: string }
  | { type: 'removed'; businessId: string; userId: string }
  | { type: 'refresh'; userId: string };

interface VersionedBookmarkIds {
  v: number;
  ids: string[];
}

const readPersistedBookmarkIds = (): string[] => {
  try {
    const raw = localStorage.getItem(BOOKMARK_IDS_LS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as VersionedBookmarkIds | string[];
    // Legacy: plain array (unversioned)
    if (Array.isArray(parsed)) {
      localStorage.removeItem(BOOKMARK_IDS_LS_KEY);
      return [];
    }
    if (typeof parsed === 'object' && parsed.v === BOOKMARK_DATA_VERSION) {
      return Array.isArray(parsed.ids) ? parsed.ids.map(String) : [];
    }
    // Version mismatch or unknown shape → purge stale data
    localStorage.removeItem(BOOKMARK_IDS_LS_KEY);
    localStorage.removeItem(BOOKMARK_PLACES_LS_KEY);
    return [];
  } catch {
    return [];
  }
};

const writePersistedBookmarkIds = (ids: string[]) => {
  try {
    const payload: VersionedBookmarkIds = { v: BOOKMARK_DATA_VERSION, ids };
    localStorage.setItem(BOOKMARK_IDS_LS_KEY, JSON.stringify(payload));
  } catch {
    // ignore quota / privacy mode
  }
};

// Singleton BroadcastChannel so all hook instances in the same tab share one
// subscription and we don't open redundant channels.
let bookmarkChannel: BroadcastChannel | null = null;
const getBookmarkChannel = (): BroadcastChannel | null => {
  if (typeof window === 'undefined' || typeof BroadcastChannel === 'undefined') {
    return null;
  }
  if (!bookmarkChannel) {
    bookmarkChannel = new BroadcastChannel(BOOKMARK_SYNC_CHANNEL);
  }
  return bookmarkChannel;
};

const broadcastBookmarkChange = (message: BookmarkSyncMessage) => {
  try {
    getBookmarkChannel()?.postMessage(message);
  } catch (e) {
    console.warn('Bookmark broadcast failed:', e);
  }
};

export const useBusinessBookmarks = () => {
  const { user, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  // Rehydrate ids synchronously from localStorage so bookmark icons render
  // in their correct state immediately on first paint, before the network
  // sync completes.
  const [bookmarks, setBookmarks] = useState<string[]>(() => readPersistedBookmarkIds());
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const BOOKMARKS_QUERY_KEY = ['bookmarked-businesses'] as const;

  // Persist any change to the id list so the next page load can rehydrate.
  useEffect(() => {
    writePersistedBookmarkIds(bookmarks);
  }, [bookmarks]);

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
    if (!isAuthenticated) {
      setBookmarks([]);
      return;
    }
    fetchBookmarks();
  }, [fetchBookmarks, isAuthenticated]);

  // Cross-tab sync: listen for bookmark changes from other tabs (same user)
  // and reconcile local state + react-query cache without forcing a refetch
  // when we can apply the delta directly.
  useEffect(() => {
    if (!isAuthenticated || !user) return;

    const channel = getBookmarkChannel();
    if (!channel) return;

    const handleMessage = (event: MessageEvent<BookmarkSyncMessage>) => {
      const msg = event.data;
      if (!msg || msg.userId !== user.uid) return;

      if (msg.type === 'added') {
        setBookmarks(prev => prev.includes(msg.businessId) ? prev : [...prev, msg.businessId]);
        queryClient.invalidateQueries({ queryKey: BOOKMARKS_QUERY_KEY, exact: true });
      } else if (msg.type === 'removed') {
        setBookmarks(prev => prev.filter(id => id !== msg.businessId));
        const cached = queryClient.getQueryData<Place[]>(BOOKMARKS_QUERY_KEY);
        if (cached) {
          queryClient.setQueryData<Place[]>(
            BOOKMARKS_QUERY_KEY,
            cached.filter(p => p.id !== msg.businessId),
          );
        }
        queryClient.invalidateQueries({ queryKey: BOOKMARKS_QUERY_KEY, exact: true });
      } else if (msg.type === 'refresh') {
        fetchBookmarks();
        queryClient.invalidateQueries({ queryKey: BOOKMARKS_QUERY_KEY, exact: true });
      }
    };

    channel.addEventListener('message', handleMessage);

    // Fallback for browsers without BroadcastChannel parity: storage events
    // fire across tabs whenever localStorage changes.
    const handleStorage = (e: StorageEvent) => {
      if (e.key !== BOOKMARK_IDS_LS_KEY) return;
      const next = readPersistedBookmarkIds();
      setBookmarks(prev => {
        const same = prev.length === next.length && prev.every((id, i) => id === next[i]);
        return same ? prev : next;
      });
      queryClient.invalidateQueries({ queryKey: BOOKMARKS_QUERY_KEY, exact: true });
    };
    window.addEventListener('storage', handleStorage);

    return () => {
      channel.removeEventListener('message', handleMessage);
      window.removeEventListener('storage', handleStorage);
    };
  }, [isAuthenticated, user, queryClient, fetchBookmarks]);

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

      const businessIdInt = parseInt(businessId);
      if (isNaN(businessIdInt)) {
        console.error('Invalid business ID:', businessId);
        toast.error('Invalid business ID');
        return false;
      }

      // Dedupe: check local id set AND the cached bookmarked-businesses list
      const cachedList = queryClient.getQueryData<Place[]>(BOOKMARKS_QUERY_KEY);
      const alreadyInCache = cachedList?.some(p => p.id === businessId) ?? false;
      if (bookmarks.includes(businessId) || alreadyInCache) {
        console.log('📌 Bookmark already present (local/cache), skipping insert');
        // Ensure local set is in sync
        setBookmarks(prev => prev.includes(businessId) ? prev : [...prev, businessId]);
        return true;
      }

      const sessionUserId = await getSessionUserId();
      if (!sessionUserId) {
        toast.error('Session expired. Please sign in again.');
        return false;
      }

      // Server-side dedupe guard: re-check the row exists for this user
      const { data: existing, error: existingErr } = await supabase
        .from('bookmarks')
        .select('id')
        .eq('user_id', sessionUserId)
        .eq('business_id', businessIdInt)
        .maybeSingle();

      if (existingErr) {
        console.warn('Bookmark pre-check failed, will rely on unique constraint:', existingErr);
      }
      if (existing) {
        setBookmarks(prev => prev.includes(businessId) ? prev : [...prev, businessId]);
        queryClient.invalidateQueries({ queryKey: BOOKMARKS_QUERY_KEY, exact: true });
        broadcastBookmarkChange({ type: 'added', businessId, userId: user.uid });
        return true;
      }

      console.log('📌 Adding bookmark:', { userId: sessionUserId, businessId: businessIdInt });

      // Optimistic UI: add to local set immediately
      setBookmarks(prev => prev.includes(businessId) ? prev : [...prev, businessId]);

      // Upsert with ignoreDuplicates so the unique (user_id, business_id) constraint
      // makes the operation idempotent — no duplicate rows even on rapid double-taps.
      const { data, error } = await supabase
        .from('bookmarks')
        .upsert(
          { user_id: sessionUserId, business_id: businessIdInt },
          { onConflict: 'user_id,business_id', ignoreDuplicates: true },
        )
        .select();

      if (error) {
        console.error('❌ Bookmark upsert error:', error);
        toast.error(`Failed to add bookmark: ${error.message}`);
        setBookmarks(prev => prev.filter(id => id !== businessId));
        return false;
      }

      console.log('✅ Bookmark added (upsert):', data);

      queryClient.invalidateQueries({ queryKey: BOOKMARKS_QUERY_KEY, exact: true });
      broadcastBookmarkChange({ type: 'added', businessId, userId: user.uid });
      return true;
    } catch (error) {
      console.error('❌ Error adding bookmark:', error);
      toast.error('Failed to add bookmark');
      setBookmarks(prev => prev.filter(id => id !== businessId));
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [user, isAuthenticated, bookmarks, getSessionUserId, queryClient]);

  // Remove a bookmark
  const removeBookmark = useCallback(async (businessId: string) => {
    if (!user || !isAuthenticated) {
      return false;
    }

    // Snapshot for rollback
    const previousList = queryClient.getQueryData<Place[]>(BOOKMARKS_QUERY_KEY);
    const wasBookmarked = bookmarks.includes(businessId);

    // Optimistic UI: remove from local id set + cached list immediately
    setBookmarks(prev => prev.filter(id => id !== businessId));
    if (previousList) {
      const trimmed = previousList.filter(p => p.id !== businessId);
      queryClient.setQueryData<Place[]>(BOOKMARKS_QUERY_KEY, trimmed);
      // Mirror the optimistic update into localStorage so a reload before the
      // network confirms still shows the bookmark as removed.
      try {
        localStorage.setItem('bookmark-places', JSON.stringify(trimmed));
      } catch {
        // ignore
      }
    }

    try {
      setIsLoading(true);

      const sessionUserId = await getSessionUserId();
      if (!sessionUserId) {
        toast.error('Session expired. Please sign in again.');
        if (wasBookmarked) setBookmarks(prev => prev.includes(businessId) ? prev : [...prev, businessId]);
        if (previousList) queryClient.setQueryData(BOOKMARKS_QUERY_KEY, previousList);
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

      queryClient.invalidateQueries({ queryKey: BOOKMARKS_QUERY_KEY, exact: true });
      broadcastBookmarkChange({ type: 'removed', businessId, userId: user.uid });
      return true;
    } catch (error) {
      console.error('Error removing bookmark:', error);
      toast.error('Failed to remove bookmark');
      if (wasBookmarked) setBookmarks(prev => prev.includes(businessId) ? prev : [...prev, businessId]);
      if (previousList) queryClient.setQueryData(BOOKMARKS_QUERY_KEY, previousList);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [user, isAuthenticated, bookmarks, getSessionUserId, queryClient]);

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
