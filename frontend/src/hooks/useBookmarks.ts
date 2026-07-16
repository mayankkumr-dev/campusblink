import { useState, useCallback, useEffect, useRef } from 'react';
import localforage from 'localforage';
import toast from 'react-hot-toast';
import { getBookmarkedPosts, togglePostBookmark } from '../api/community';
import { useAuthStore } from '../store/authStore';
import type { NormalizedPost } from '../types/bookmark';

const BOOKMARKS_CACHE_KEY = 'saved-bookmarks-cache';

interface UseBookmarksReturn {
  /** List of bookmarked posts for the current page batch */
  bookmarkedPosts: NormalizedPost[];
  /** True during the initial fetch */
  isLoading: boolean;
  /** True when loading more pages */
  isLoadingMore: boolean;
  /** Error message from the last operation, if any */
  error: string | null;
  /** Whether more pages exist beyond what's loaded */
  hasMore: boolean;
  /** Load the next page of bookmarks (append) */
  loadMore: () => Promise<void>;
  /** Toggle bookmark for a given post — returns the new bookmarked state */
  toggleBookmark: (postId: string) => Promise<boolean>;
  /** Optimistically remove a post from the loaded list (for un-bookmark from Saved page) */
  removeFromList: (postId: string) => void;
  /** Re-fetch bookmarks from page 1 */
  refresh: () => Promise<void>;
  /** Whether the user is offline and viewing cached data */
  isOffline: boolean;
}

/**
 * Custom hook for managing the user's bookmarks.
 *
 * Separates API calls from React components for testability.
 * Provides optimistic UI updates, pagination, and offline fallback caching.
 */
export function useBookmarks(): UseBookmarksReturn {
  const { user, profile } = useAuthStore();
  const userId = user?.id || profile?.id;

  const [bookmarkedPosts, setBookmarkedPosts] = useState<NormalizedPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [isOffline, setIsOffline] = useState(
    typeof navigator !== 'undefined' ? !navigator.onLine : false
  );

  const pageRef = useRef(1);
  const fetchingRef = useRef(false);

  // Track online/offline status
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handler = () => setIsOffline(!navigator.onLine);
    window.addEventListener('online', handler);
    window.addEventListener('offline', handler);
    return () => {
      window.removeEventListener('online', handler);
      window.removeEventListener('offline', handler);
    };
  }, []);

  /** Fetch bookmarks for a given page. Returns the posts and hasMore flag. */
  const fetchPage = useCallback(
    async (page: number) => {
      if (!userId) return { posts: [], more: false };
      const { data, hasMore: more, error: fetchErr } = await getBookmarkedPosts(userId, page);
      if (fetchErr) throw fetchErr;
      return { posts: data as NormalizedPost[], more };
    },
    [userId]
  );

  /** Load cached bookmarks from localforage (offline fallback) */
  const loadFromCache = useCallback(async () => {
    try {
      const cached = await localforage.getItem<NormalizedPost[]>(BOOKMARKS_CACHE_KEY);
      if (cached && cached.length > 0) {
        setBookmarkedPosts(cached);
        setHasMore(false); // Cache is a snapshot; don't paginate offline
        return true;
      }
    } catch {
      // localforage can fail silently
    }
    return false;
  }, []);

  /** Save current bookmarks list to cache */
  const saveToCache = useCallback(async (posts: NormalizedPost[]) => {
    try {
      await localforage.setItem(BOOKMARKS_CACHE_KEY, posts);
    } catch {
      // Non-critical
    }
  }, []);

  /** Initial load (page 1) */
  const refresh = useCallback(async () => {
    if (!userId) {
      setBookmarkedPosts([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    pageRef.current = 1;

    // If offline, try cache first
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      const loaded = await loadFromCache();
      if (!loaded) {
        setBookmarkedPosts([]);
        setError('You are offline. No cached bookmarks available.');
      }
      setIsLoading(false);
      return;
    }

    try {
      const { posts, more } = await fetchPage(1);
      setBookmarkedPosts(posts);
      setHasMore(more);
      await saveToCache(posts);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load bookmarks';
      setError(message);
      // Fallback to cache on network error
      const loaded = await loadFromCache();
      if (!loaded) setBookmarkedPosts([]);
    } finally {
      setIsLoading(false);
    }
  }, [userId, fetchPage, loadFromCache, saveToCache]);

  /** Load next page (append to list) */
  const loadMore = useCallback(async () => {
    if (!hasMore || fetchingRef.current || !userId) return;
    fetchingRef.current = true;
    setIsLoadingMore(true);

    try {
      const nextPage = pageRef.current + 1;
      const { posts, more } = await fetchPage(nextPage);
      pageRef.current = nextPage;
      setHasMore(more);
      setBookmarkedPosts((prev) => {
        const merged = [...prev, ...posts];
        saveToCache(merged);
        return merged;
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load more bookmarks';
      toast.error(message);
    } finally {
      setIsLoadingMore(false);
      fetchingRef.current = false;
    }
  }, [hasMore, userId, fetchPage, saveToCache]);

  /** Toggle bookmark with optimistic update */
  const toggleBookmark = useCallback(
    async (postId: string): Promise<boolean> => {
      if (!userId) {
        toast.error('Log in to bookmark');
        return false;
      }

      const { data, error: toggleErr } = await togglePostBookmark(postId, userId);
      if (toggleErr) {
        toast.error('Failed to update bookmark');
        return false;
      }

      return data?.bookmarked ?? false;
    },
    [userId]
  );

  /** Remove a post from the in-memory list (optimistic unbookmark from Saved page) */
  const removeFromList = useCallback((postId: string) => {
    setBookmarkedPosts((prev) => {
      const updated = prev.filter((p) => p.id !== postId);
      saveToCache(updated);
      return updated;
    });
  }, [saveToCache]);

  // Auto-fetch on mount and when userId changes
  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    bookmarkedPosts,
    isLoading,
    isLoadingMore,
    error,
    hasMore,
    loadMore,
    toggleBookmark,
    removeFromList,
    refresh,
    isOffline,
  };
}
