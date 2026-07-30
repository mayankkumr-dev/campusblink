/**
 * SavedBookmarks — Displays user's bookmarked posts & saved campus diaries.
 *
 * Tabbed interface:
 *  - Posts: Community feed post bookmarks (via useBookmarks)
 *  - Diaries: Saved campus diary entries (via getBookmarkedDiaries)
 */
import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { ArrowLeft, Bookmark, Loader2, WifiOff, BookOpen, Layers } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../store/authStore';
import { useBookmarks } from '../../hooks/useBookmarks';
import { FeedPost, ImageLightbox } from '../../features/community/FeedPost';
import { togglePostLike, deletePost } from '../../api/community';
import { getFollowingIds } from '../../api/follow';
import { getBookmarkedDiaries, toggleDiaryBookmark, toggleDiaryLike } from '../../api/diary';
import { DiaryFullscreen, isValidDiaryImage } from '../../features/community/DiaryMasonryGrid';
import { PostSkeleton } from './ui/Skeletons';

function SavedDiaryThumbnail({
  entry,
  onClick,
}: {
  entry: any;
  onClick: () => void;
}) {
  const [imageFailed, setImageFailed] = useState(false);
  const background = entry.gradient || entry.bg_color || '#ffffff';
  const fontSize = Math.max(11, Math.round(12 * (entry.scale || 1)));
  const hasImage = !imageFailed && isValidDiaryImage(entry.image_url);

  return (
    <button
      onClick={onClick}
      className="aspect-square w-full rounded-xl overflow-hidden relative shadow-sm cursor-pointer border border-gray-200/70 flex flex-col justify-between select-none group transition-transform active:scale-95 hover:shadow-md"
      style={{ background: hasImage ? '#0F172A' : background }}
      aria-label={`View saved diary: ${entry.content?.slice(0, 30) || 'Story'}`}
    >
      {hasImage ? (
        <img
          src={entry.image_url!}
          alt="Saved diary thumbnail"
          onError={() => setImageFailed(true)}
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
        />
      ) : null}

      <div className="relative z-10 inset-0 flex-1 flex items-center justify-center p-2.5 w-full">
        {!hasImage && entry.content?.trim() && (
          <p
            className="text-center line-clamp-4 leading-snug break-words"
            style={{
              fontFamily: `'${entry.font_family || 'Caveat'}', serif`,
              fontSize,
              color: entry.text_color || '#1E293B',
            }}
          >
            {entry.content}
          </p>
        )}
      </div>

      <div className="relative z-20 w-full p-2 flex justify-between items-center bg-gradient-to-t from-black/60 to-transparent">
        <span className="text-[10px] font-extrabold text-white truncate max-w-[80px]">
          {entry.author?.name || 'Student'}
        </span>
        <Bookmark className="w-3.5 h-3.5 fill-amber-400 text-amber-400 drop-shadow-sm" />
      </div>
    </button>
  );
}

export const SavedBookmarks = () => {
  const { profile } = useAuthStore();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'posts' | 'diaries'>('posts');

  // Posts Bookmarks hook
  const {
    bookmarkedPosts,
    isLoading: isLoadingPosts,
    isLoadingMore,
    error: postsError,
    hasMore,
    loadMore,
    removeFromList,
    refresh: refreshPosts,
    isOffline,
  } = useBookmarks();

  // Diaries Bookmarks state
  const [savedDiaries, setSavedDiaries] = useState<any[]>([]);
  const [isLoadingDiaries, setIsLoadingDiaries] = useState(false);
  const [diariesError, setDiariesError] = useState<string | null>(null);
  const [viewDiary, setViewDiary] = useState<any | null>(null);

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

  // Load saved diaries
  const fetchSavedDiaries = useCallback(async () => {
    if (!profile?.id) return;
    setIsLoadingDiaries(true);
    setDiariesError(null);
    try {
      const { data, error } = await getBookmarkedDiaries(profile.id);
      if (error) throw error;
      setSavedDiaries(data || []);
    } catch (err: any) {
      setDiariesError(err?.message || 'Failed to load saved diaries');
    } finally {
      setIsLoadingDiaries(false);
    }
  }, [profile?.id]);

  useEffect(() => {
    if (activeTab === 'diaries') {
      fetchSavedDiaries();
    }
  }, [activeTab, fetchSavedDiaries]);

  // Infinite scroll observer for posts
  useEffect(() => {
    if (activeTab !== 'posts' || !hasMore || isLoadingMore) return;
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
  }, [activeTab, hasMore, isLoadingMore, loadMore]);

  const handleFollowChange = (userId: string, nextFollowing: boolean) => {
    setFollowingIds((prev) => {
      const next = new Set(prev);
      if (nextFollowing) next.add(userId);
      else next.delete(userId);
      return next;
    });
  };

  const handleLike = async (postId: string) => {
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

  const handleBookmarkChange = (postId: string, bookmarked: boolean) => {
    if (!bookmarked) {
      removeFromList(postId);
    }
  };

  const handleDiaryBookmarkToggle = async (diaryId: string) => {
    if (!profile?.id) return;
    setSavedDiaries((prev) => prev.filter((d) => d.id !== diaryId));
    if (viewDiary?.id === diaryId) {
      setViewDiary(null);
    }
    const { data, error } = await toggleDiaryBookmark(diaryId, profile.id);
    if (error) {
      toast.error('Could not update bookmark');
      fetchSavedDiaries();
    } else {
      toast.success(data?.bookmarked ? 'Saved to Bookmarks' : 'Removed from Bookmarks');
    }
  };

  // ---------- Render ----------

  return (
    <div className="w-full flex justify-center bg-[var(--bg)] min-h-screen text-[var(--text-primary)] pb-28">
      <div className="w-full max-w-[600px] border-x border-black/10 flex flex-col min-h-screen">
        {/* Header */}
        <header className="sticky top-0 z-20 bg-[var(--bg)]/90 backdrop-blur-md border-b border-black/10 px-4 py-3 flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="rounded-full p-2 text-[var(--text-secondary)] transition-colors hover:bg-black/5 hover:text-[var(--text-primary)]"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <h1 className="font-syne text-xl font-extrabold text-[var(--text-primary)]">Bookmarks & Saved</h1>
              <p className="text-xs text-[var(--text-secondary)]">@{profile?.username || 'student'}</p>
            </div>
          </div>

          {/* Navigation Tab Bar */}
          <div className="flex items-center p-1 bg-black/5 dark:bg-white/5 rounded-2xl border border-black/5">
            <button
              onClick={() => setActiveTab('posts')}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 transition-all ${
                activeTab === 'posts'
                  ? 'bg-white dark:bg-slate-900 text-[var(--text-primary)] shadow-sm'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>Posts</span>
              {bookmarkedPosts.length > 0 && (
                <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-blue-100 text-blue-700 font-black">
                  {bookmarkedPosts.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('diaries')}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 transition-all ${
                activeTab === 'diaries'
                  ? 'bg-white dark:bg-slate-900 text-[var(--text-primary)] shadow-sm'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              <span>Diaries</span>
              {savedDiaries.length > 0 && (
                <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-amber-100 text-amber-800 font-black">
                  {savedDiaries.length}
                </span>
              )}
            </button>
          </div>
        </header>

        {/* Offline banner */}
        {isOffline && (
          <div className="mx-4 mt-3 flex items-center gap-2 rounded-lg border border-amber-300/40 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">
            <WifiOff className="h-3.5 w-3.5" />
            You are offline. Showing cached bookmarks.
          </div>
        )}

        {/* ── Tab 1: Community Posts Bookmarks ────────────────────────────── */}
        {activeTab === 'posts' && (
          <>
            {postsError && !isLoadingPosts && (
              <div className="mx-4 mt-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                <p className="font-semibold">Something went wrong</p>
                <p className="mt-1 text-xs">{postsError}</p>
                <button
                  onClick={() => void refreshPosts()}
                  className="mt-2 rounded-full bg-red-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-red-700 transition"
                >
                  Try again
                </button>
              </div>
            )}

            {isLoadingPosts ? (
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
                    onReportPost={() => toast('Reported')}
                    onReportAccount={() => toast('Reported')}
                    onOpenImage={(images, index) => setLightbox({ images, index })}
                    followingIds={followingIds}
                    onFollowChange={handleFollowChange}
                    onBookmarkChange={handleBookmarkChange}
                  />
                ))}

                {hasMore && (
                  <div ref={sentinelRef} className="flex justify-center py-6">
                    {isLoadingMore && <Loader2 className="h-6 w-6 animate-spin text-[var(--text-secondary)]" />}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center px-6 py-20 text-center">
                <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-[var(--accent-blue,#3b82f6)]/10 mb-4">
                  <Bookmark className="h-9 w-9 text-[var(--accent-blue,#3b82f6)]" />
                </div>
                <h2 className="font-syne text-2xl font-extrabold text-[var(--text-primary)]">No saved posts</h2>
                <p className="mt-2 max-w-xs text-sm text-[var(--text-secondary)]">
                  Bookmark community posts to save them for later. They will appear here!
                </p>
                <button
                  onClick={() => navigate('/student/community')}
                  className="mt-6 inline-flex items-center gap-2 rounded-full bg-[var(--yellow)] px-5 py-2.5 text-sm font-bold text-[var(--text-primary)] hover:bg-[var(--yellow)]/90 transition"
                >
                  Browse Community
                </button>
              </div>
            )}
          </>
        )}

        {/* ── Tab 2: Campus Diaries Bookmarks ─────────────────────────────── */}
        {activeTab === 'diaries' && (
          <>
            {diariesError && !isLoadingDiaries && (
              <div className="mx-4 mt-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                <p className="font-semibold">Could not load saved diaries</p>
                <p className="mt-1 text-xs">{diariesError}</p>
                <button
                  onClick={() => void fetchSavedDiaries()}
                  className="mt-2 rounded-full bg-red-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-red-700 transition"
                >
                  Try again
                </button>
              </div>
            )}

            {isLoadingDiaries ? (
              <div className="p-4 grid grid-cols-3 gap-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="aspect-square w-full rounded-xl bg-gray-200 dark:bg-gray-800 animate-pulse" />
                ))}
              </div>
            ) : savedDiaries.length > 0 ? (
              <div className="p-4 grid grid-cols-3 gap-2 flex-1">
                {savedDiaries.map((entry) => (
                  <SavedDiaryThumbnail
                    key={entry.id}
                    entry={entry}
                    onClick={() => setViewDiary(entry)}
                  />
                ))}
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center px-6 py-20 text-center">
                <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-amber-500/10 mb-4">
                  <BookOpen className="h-9 w-9 text-amber-600" />
                </div>
                <h2 className="font-syne text-2xl font-extrabold text-[var(--text-primary)]">No saved campus stories</h2>
                <p className="mt-2 max-w-xs text-sm text-[var(--text-secondary)]">
                  Bookmark handwritten diary stories from Campus Diaries to keep your favorite memories here!
                </p>
                <button
                  onClick={() => navigate('/student/community')}
                  className="mt-6 inline-flex items-center gap-2 rounded-full bg-amber-400 px-5 py-2.5 text-sm font-extrabold text-slate-950 hover:bg-amber-300 transition shadow-sm"
                >
                  Explore Campus Diaries
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Lightbox for Posts */}
      {lightbox && (
        <ImageLightbox
          images={lightbox.images}
          index={lightbox.index}
          onClose={() => setLightbox(null)}
          onNavigate={(index) => setLightbox((current) => current ? { ...current, index } : current)}
        />
      )}

      {/* Fullscreen Viewer for Saved Diaries */}
      {viewDiary && (
        <DiaryFullscreen
          entry={viewDiary}
          currentUserId={profile?.id}
          onClose={() => setViewDiary(null)}
          onDelete={() => {}}
          onLike={async (id) => {
            if (!profile?.id) return;
            await toggleDiaryLike(id, profile.id);
          }}
          onBookmark={handleDiaryBookmarkToggle}
          onCommentClick={() => toast('Head to Campus Diaries feed to comment')}
          onShareClick={(entry) => {
            const diaryUrl = `${window.location.origin}/student/community?diaryId=${entry.id}`;
            if (navigator.share) {
              navigator.share({
                title: `Campus Diaries • ${entry.author?.name || 'Story'}`,
                text: entry.content || 'Check out this campus moment!',
                url: diaryUrl,
              }).catch(() => {});
            } else {
              navigator.clipboard.writeText(diaryUrl);
              toast.success('Story link copied!');
            }
          }}
        />
      )}
    </div>
  );
};
