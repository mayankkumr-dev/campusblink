/**
 * SavedBookmarks — Displays the user's bookmarked posts using shared FeedPost cards.
 *
 * Uses the useBookmarks hook for data/pagination/caching and FeedPost for rendering.
 * Features: infinite scroll, empty/error/offline states, optimistic un-bookmark.
 */
import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { ArrowLeft, Bookmark, Loader2, WifiOff } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../store/authStore';
import { useBookmarks } from '../../hooks/useBookmarks';
import { FeedPost, ImageLightbox } from '../../features/community/FeedPost';
import { togglePostLike, deletePost, reportContent } from '../../api/community';
import { getFollowingIds } from '../../api/follow';
import { PostSkeleton } from './ui/Skeletons';

export const SavedBookmarks = () => {
  const { profile } = useAuthStore();
  const navigate = useNavigate();
  const {
    bookmarkedPosts,
    isLoading,
    isLoadingMore,
    error,
    hasMore,
    loadMore,
    removeFromList,
    refresh,
    isOffline,
  } = useBookmarks();

  const [lightbox, setLightbox] = useState<{ images: string[]; index: number } | null>(null);
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  // Load following IDs for FollowButton
  useEffect(() => {
    if (!profile?.id) return;
    let mounted = true;
    getFollowingIds(profile.id).then(({ data }) => {
      if (mounted) setFollowingIds(new Set(data || []));
    });
    return () => { mounted = false; };
  }, [profile?.id]);

  // Infinite scroll observer
  useEffect(() => {
    if (!hasMore || isLoadingMore) return;
    const el = sentinelRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          void loadMore();
        }
      },
      { rootMargin: '200px' }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, isLoadingMore, loadMore]);

  const handleFollowChange = (userId: string, nextFollowing: boolean) => {
    setFollowingIds((prev) => {
      const next = new Set(prev);
      if (nextFollowing) next.add(userId);
      else next.delete(userId);
      return next;
    });
  };

  const handleLike = async (postId: string, likedByMe: boolean) => {
    if (!profile?.id) {
      toast.error('Please log in to like posts.');
      return;
    }
    const { error } = await togglePostLike(postId, profile.id);
    if (error) {
      toast.error(error.message || 'Could not update like.');
    }
  };

  const handleDelete = async (post: any) => {
    if (!profile?.id || post.author_id !== profile.id) {
      toast.error('You can only delete your own post.');
      return;
    }
    if (!confirm('Delete this post?')) return;
    const { error } = await deletePost(post.id);
    if (error) {
      toast.error((error as any)?.message || 'Failed to delete post.');
      return;
    }
    toast.success('Post deleted.');
    removeFromList(post.id);
  };

  const handleReportPost = (post: any) => {
    toast('Report feature coming soon.', { icon: '🚧' });
  };

  const handleReportAccount = (post: any) => {
    toast('Report feature coming soon.', { icon: '🚧' });
  };

  const handleBookmarkChange = (postId: string, bookmarked: boolean) => {
    // If unbookmarked from the saved page, remove from list
    if (!bookmarked) {
      removeFromList(postId);
    }
  };

  // ---------- Render ----------

  return (
    <div className="w-full flex justify-center bg-[var(--bg)] min-h-screen text-[var(--text-primary)] pb-28">
      <div className="w-full max-w-[600px] border-x border-black/10 flex flex-col min-h-screen">
        {/* Header */}
        <header className="sticky top-0 z-10 bg-[var(--bg)]/80 backdrop-blur-md border-b border-black/10 px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="rounded-full p-2 text-[var(--text-secondary)] transition-colors hover:bg-black/5 hover:text-[var(--text-primary)]"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="font-syne text-xl font-extrabold text-[var(--text-primary)]">Bookmarks</h1>
            <p className="text-xs text-[var(--text-secondary)]">@{profile?.username || 'student'}</p>
          </div>
        </header>

        {/* Offline banner */}
        {isOffline && (
          <div className="mx-4 mt-3 flex items-center gap-2 rounded-lg border border-amber-300/40 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">
            <WifiOff className="h-3.5 w-3.5" />
            You are offline. Showing cached bookmarks.
          </div>
        )}

        {/* Error state */}
        {error && !isLoading && (
          <div className="mx-4 mt-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <p className="font-semibold">Something went wrong</p>
            <p className="mt-1 text-xs">{error}</p>
            <button
              onClick={() => void refresh()}
              className="mt-2 rounded-full bg-red-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-red-700 transition"
            >
              Try again
            </button>
          </div>
        )}

        {/* Loading state */}
        {isLoading ? (
          <div className="space-y-3 px-4 py-5">
            {Array.from({ length: 4 }).map((_, i) => (
              <PostSkeleton key={`bookmark-skeleton-${i}`} />
            ))}
          </div>
        ) : bookmarkedPosts.length > 0 ? (
          <div className="space-y-0 flex-1">
            {bookmarkedPosts.map((post: any) => (
              <FeedPost
                key={post.id}
                post={{ ...post, user_has_bookmarked: true }}
                profile={profile}
                onLike={handleLike}
                onDelete={handleDelete}
                onReportPost={handleReportPost}
                onReportAccount={handleReportAccount}
                onOpenImage={(images, index) => setLightbox({ images, index })}
                followingIds={followingIds}
                onFollowChange={handleFollowChange}
                onBookmarkChange={handleBookmarkChange}
              />
            ))}

            {/* Load more sentinel */}
            {hasMore && (
              <div ref={sentinelRef} className="flex justify-center py-6">
                {isLoadingMore && <Loader2 className="h-6 w-6 animate-spin text-[var(--text-secondary)]" />}
              </div>
            )}
          </div>
        ) : (
          /* Empty state */
          <div className="flex-1 flex flex-col items-center justify-center px-6 py-20 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-[var(--accent-blue,#3b82f6)]/10 mb-4">
              <Bookmark className="h-9 w-9 text-[var(--accent-blue,#3b82f6)]" />
            </div>
            <h2 className="font-syne text-2xl font-extrabold text-[var(--text-primary)]">Save posts for later</h2>
            <p className="mt-2 max-w-xs text-sm text-[var(--text-secondary)]">
              Bookmark posts you want to revisit. They'll show up here so you never lose track.
            </p>
            <button
              onClick={() => navigate('/student/community')}
              className="mt-6 inline-flex items-center gap-2 rounded-full bg-[var(--yellow)] px-5 py-2.5 text-sm font-bold text-[var(--text-primary)] hover:bg-[var(--yellow)]/90 transition"
            >
              Browse Community
            </button>
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightbox && (
        <ImageLightbox
          images={lightbox.images}
          index={lightbox.index}
          onClose={() => setLightbox(null)}
          onNavigate={(index) => setLightbox((current) => current ? { ...current, index } : current)}
        />
      )}
    </div>
  );
};
