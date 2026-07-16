import React, { useEffect, useRef, useState, Fragment } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Image as ImageIcon, Link2, Plus, Search, Send, Users, X } from 'lucide-react';
import { Transition, Dialog } from '@headlessui/react';
import { useNavigate } from 'react-router';
import toast from 'react-hot-toast';
import localforage from 'localforage';
import { useAuthStore } from '../../store/authStore';
import { createPost, deletePost, getPosts, reportContent, togglePostLike, addComment } from '../../api/community';
import { getFollowingIds, getFollowingPosts } from '../../api/follow';
import { useCommunityFeed } from '../../hooks/useRealtime';
import { useFeatureAccess } from '../../hooks/useFeatureAccess';
import { AccessDenied } from '../../shared/components/AccessDenied';
import { getAvatarDataUrl } from '../../lib/avatar';
import { ListSkeleton, PostSkeleton } from '../../app/components/ui/Skeletons';
import { FeedPost, ImageLightbox, parseImageUrls } from './FeedPost';

const ONLY_COLLEGE = 'Maharaja Agrasen Institute of Technology (MAIT)';
const POST_IMAGE_DELIMITER = '|||';
const COMMUNITY_IMAGE_MIN_WIDTH = 600;
const COMMUNITY_IMAGE_MAX_BYTES = 5 * 1024 * 1024;
const COMMUNITY_GIF_MAX_BYTES = 15 * 1024 * 1024;
const COMMUNITY_ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif'];
const COMMUNITY_CACHE_PREFIX = 'community-feed-cache';

export const CommunityFeed: React.FC = () => {
  const profile = useAuthStore((state) => state.profile);
  const { hasAccess: hasCommunityAccess, isChecking: checkingCommunityAccess } = useFeatureAccess('community_access');
  const { isAllowed } = useFeatureAccess(profile);
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('All');
  const [collegeFilter, setCollegeFilter] = useState('all');
  const [allPosts, setAllPosts] = useState<any[]>([]);
  const [posts, setPosts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [composerExpanded, setComposerExpanded] = useState(false);
  const [lightbox, setLightbox] = useState<{ images: string[]; index: number } | null>(null);
  const [reportModal, setReportModal] = useState<{ targetType: 'post' | 'profile'; targetId: string } | null>(null);
  const [reportReason, setReportReason] = useState('');
  const [reportDetails, setReportDetails] = useState('');
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const [isOffline, setIsOffline] = useState<boolean>(typeof navigator !== 'undefined' ? !navigator.onLine : false);

  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());
  const [noFollows, setNoFollows] = useState(false);
  const composeParams = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
  const initialComposeType = composeParams.get('type') || 'discussion';

  const tabs = [
    { label: 'All', value: 'all' },
    { label: 'Following', value: 'following' },
    { label: 'Notices', value: 'notice' },
    { label: 'Internships', value: 'internship' },
    { label: 'Discussions', value: 'discussion' },
    { label: 'Memes', value: 'meme' },
    { label: 'Confessions', value: 'confession' },
  ];

  // Load which users we follow
  useEffect(() => {
    if (!profile?.id) return;
    let mounted = true;
    getFollowingIds(profile.id).then(({ data }) => {
      if (mounted) setFollowingIds(new Set(data || []));
    });
    return () => { mounted = false; };
  }, [profile?.id]);

  useEffect(() => {
    const params = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
    if (params.get('compose') === '1') {
      setComposerExpanded(true);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleOfflineState = () => setIsOffline(!navigator.onLine);
    handleOfflineState();
    window.addEventListener('online', handleOfflineState);
    window.addEventListener('offline', handleOfflineState);
    return () => {
      window.removeEventListener('online', handleOfflineState);
      window.removeEventListener('offline', handleOfflineState);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadPosts = async () => {
      setIsLoading(true);

      const typeValue = tabs.find((tab) => tab.label === activeTab)?.value || 'all';
      const cacheKey = activeTab === 'Following'
        ? `${COMMUNITY_CACHE_PREFIX}:following:${profile?.id || 'anonymous'}`
        : `${COMMUNITY_CACHE_PREFIX}:${typeValue}`;

      const loadFromCache = async () => {
        const cached = await localforage.getItem<{ posts: any[]; noFollows: boolean }>(cacheKey);
        if (cached) {
          if (cancelled) return false;
          setAllPosts(Array.isArray(cached.posts) ? cached.posts : []);
          setNoFollows(Boolean(cached.noFollows));
          return true;
        }
        return false;
      };

      try {
        if (activeTab === 'Following') {
          if (!profile?.id) {
            setAllPosts([]);
            setNoFollows(false);
            setIsLoading(false);
            return;
          }

          // Prefer cache immediately when offline.
          if (typeof navigator !== 'undefined' && !navigator.onLine) {
            const loaded = await loadFromCache();
            if (!loaded) {
              setAllPosts([]);
              setNoFollows(false);
            }
            setIsLoading(false);
            return;
          }

          const { data, error, noFollows: noF } = await getFollowingPosts(profile.id);
          if (error) throw error;

          const fetchedPosts = data || [];
          if (cancelled) return;

          setAllPosts(fetchedPosts);
          setNoFollows(Boolean(noF));
          await localforage.setItem(cacheKey, { posts: fetchedPosts, noFollows: Boolean(noF) });
        } else {
          // Prefer cache immediately when offline.
          if (typeof navigator !== 'undefined' && !navigator.onLine) {
            const loaded = await loadFromCache();
            if (!loaded) {
              setAllPosts([]);
              setNoFollows(false);
            }
            setIsLoading(false);
            return;
          }

          const { data, error } = await getPosts(typeValue);
          if (error) throw error;

          const fetchedPosts = data || [];
          if (cancelled) return;

          setAllPosts(fetchedPosts);
          setNoFollows(false);
          await localforage.setItem(cacheKey, { posts: fetchedPosts, noFollows: false });
        }
      } catch (error: any) {
        const loaded = await loadFromCache();
        if (!loaded) {
          toast.error(error?.message || 'Failed to load posts');
          setAllPosts([]);
          setNoFollows(false);
        }
      }

      if (!cancelled) {
        setIsLoading(false);
      }
    };

    void loadPosts();

    return () => {
      cancelled = true;
    };
  }, [activeTab, profile?.id]);

  useEffect(() => {
    if (collegeFilter === 'all') {
      setPosts(allPosts);
      return;
    }

    setPosts(allPosts.filter((post) => (post.author?.college || '').toLowerCase() === collegeFilter.toLowerCase()));
  }, [allPosts, collegeFilter]);

  useCommunityFeed((newPost: any) => {
    if (activeTab === 'Following') {
      if (!followingIds.has(newPost.author_id)) return;
    } else {
      const typeValue = tabs.find((tab) => tab.label === activeTab)?.value || 'all';
      if (typeValue !== 'all' && newPost.type !== typeValue) return;
    }

    const hydratedPost = {
      ...newPost,
      likes_count: newPost.likes_count ?? 0,
      liked_by: [],
      image_urls: parseImageUrls(newPost),
      author: newPost.author || {
        name: 'Campus Student',
        username: null,
        avatar_url: null,
        college: newPost.college || ONLY_COLLEGE,
      },
    };

    setAllPosts((prev) => { if (prev.some(p => p.id === hydratedPost.id)) return prev; return [hydratedPost, ...prev]; });
  });

  const collegeOptions: string[] = Array.from(
    new Set<string>(
      allPosts
        .map((post) => post.author?.college)
        .filter((value): value is string => Boolean(value && typeof value === 'string' && value.trim()))
    )
  );

  const handleLike = async (postId: string, likedByMe: boolean) => {
    if (!profile?.id) {
      toast.error('Please log in to like posts.');
      return;
    }

    const applyMutation = (items: any[], reverse = false) =>
      items.map((item) => {
        if (item.id !== postId) return item;

        const likedBy = new Set(item.liked_by || []);
        const shouldUnlike = reverse ? !likedByMe : likedByMe;

        if (shouldUnlike) likedBy.delete(profile.id);
        else likedBy.add(profile.id);

        return {
          ...item,
          liked_by: Array.from(likedBy),
          likes_count: Math.max(0, (item.likes_count || 0) + (shouldUnlike ? -1 : 1)),
        };
      });

    setAllPosts((prev) => applyMutation(prev));
    setPosts((prev) => applyMutation(prev));

    const { error } = await togglePostLike(postId, profile.id);
    if (error) {
      toast.error(error.message || 'Could not update like.');
      setAllPosts((prev) => applyMutation(prev, true));
      setPosts((prev) => applyMutation(prev, true));
    }
  };

  const handleDeletePost = async (post: any) => {
    if (!profile?.id || post.author_id !== profile.id) {
      toast.error('You can only delete your own post.');
      return;
    }

    if (!confirm('Delete this post?')) {
      return;
    }

    const loadingToast = toast.loading('Deleting post...');
    const { error } = await deletePost(post.id);

    if (error) {
      toast.error((error as any)?.message || 'Failed to delete post.', { id: loadingToast });
      return;
    }

    toast.success('Post deleted.', { id: loadingToast });
    setAllPosts((prev) => prev.filter((item) => item.id !== post.id));
    setPosts((prev) => prev.filter((item) => item.id !== post.id));
  };

  const handleReportPost = (post: any) => {
    if (!profile?.id) {
      toast.error('Please log in to report posts.');
      return;
    }

    setReportReason('');
    setReportDetails('');
    setReportModal({ targetType: 'post', targetId: post.id });
  };

  const handleReportAccount = (post: any) => {
    if (!profile?.id) {
      toast.error('Please log in to report accounts.');
      return;
    }
    if (!post?.author_id) {
      toast.error('This account cannot be reported.');
      return;
    }

    setReportReason('');
    setReportDetails('');
    setReportModal({ targetType: 'profile', targetId: post.author_id });
  };

  const submitReport = async () => {
    if (!profile?.id || !reportModal?.targetId) return;

    const reason = reportReason.trim();
    if (!reason) {
      toast.error('Reason is required to submit a report.');
      return;
    }

    setIsSubmittingReport(true);
    const loadingToast = toast.loading('Submitting report...');
    const { error } = await reportContent(reportModal.targetType, reportModal.targetId, profile.id, reason, reportDetails.trim() || null);

    if (error) {
      toast.error((error as any)?.message || 'Could not submit report.', { id: loadingToast });
      setIsSubmittingReport(false);
      return;
    }

    toast.success(`${reportModal.targetType === 'post' ? 'Post' : 'Account'} reported. Admin will review it.`, { id: loadingToast });
    setIsSubmittingReport(false);
    setReportModal(null);
  };

  const handleFollowChange = (userId: string, nextFollowing: boolean) => {
    setFollowingIds((prev) => {
      const next = new Set(prev);
      if (nextFollowing) next.add(userId); else next.delete(userId);
      return next;
    });
    if (!nextFollowing && activeTab === 'Following') {
      setAllPosts((prev) => prev.filter((p) => p.author_id !== userId));
    }
  };

  if (checkingCommunityAccess) {
    return (
      <div className="min-h-screen bg-[var(--bg)] px-4 py-6 md:px-8">
        <div className="mx-auto w-full max-w-[600px] space-y-4">
          {Array.from({ length: 3 }).map((_, index) => (
            <PostSkeleton key={`community-access-loading-${index}`} />
          ))}
        </div>
      </div>
    );
  }

  if (!hasCommunityAccess) {
    return <AccessDenied feature="Community" />;
  }

  return (
    <div className="w-full flex justify-center bg-[var(--bg)] min-h-screen text-[var(--text-primary)] pb-28">
      {/* Main Feed Column */}
      <div className="w-full max-w-[600px] border-x border-black/10 flex flex-col min-h-screen">
        {isOffline ? (
          <div className="mx-4 mt-3 rounded-md border border-[var(--warning)]/35 bg-[var(--warning-light)] px-3 py-2 text-xs font-semibold text-[var(--text-primary)]">
            You are offline. Showing cached community posts.
          </div>
        ) : null}

        {/* Header Tabs */}
        <div className="sticky top-0 z-10 md:bg-[var(--bg)]/80 md:backdrop-blur-md md:border-b md:border-black/10 max-md:bg-white/95 max-md:backdrop-blur-xl max-md:border-none max-md:shadow-sm">
          <div className="flex w-full mt-1">
            <button 
              onClick={() => setActiveTab('All')}
              className="flex-1 hover:bg-[#000000]/5 transition flex justify-center pb-0"
            >
              <div className="relative py-3">
                <span className={`font-medium transition-colors ${activeTab === 'All' ? 'text-slate-900 md:text-[var(--text-primary)] font-bold' : 'text-slate-400 md:text-[var(--text-secondary)]'}`}>For you</span>
                {activeTab === 'All' && (
                  <motion.div layoutId="communityTabIndicator" className="absolute bottom-0 left-0 w-full h-1 max-md:bg-blue-600 md:bg-[var(--yellow)] rounded-full" />
                )}
              </div>
            </button>
            <button 
              onClick={() => setActiveTab('Following')}
              className="flex-1 hover:bg-[#000000]/5 transition flex justify-center pb-0"
            >
              <div className="relative py-3">
                <span className={`font-medium transition-colors ${activeTab === 'Following' ? 'text-slate-900 md:text-[var(--text-primary)] font-bold' : 'text-slate-400 md:text-[var(--text-secondary)]'}`}>Following</span>
                {activeTab === 'Following' && (
                  <motion.div layoutId="communityTabIndicator" className="absolute bottom-0 left-0 w-full h-1 max-md:bg-blue-600 md:bg-[var(--yellow)] rounded-full" />
                )}
              </div>
            </button>
          </div>
        </div>

        {/* Composer */}
        <InlinePostComposer
          profile={profile}
          canPost={isAllowed('community_posting')}
          initialType={initialComposeType}
          expanded={composerExpanded}
          onExpandedChange={setComposerExpanded}
          onCreated={(post) => {
            const hydratedPost = {
              ...post,
              likes_count: post.likes_count ?? 0,
              liked_by: [],
              image_urls: parseImageUrls(post),
              author: {
                id: profile?.id,
                name: profile?.name || 'Campus Student',
                username: profile?.username || null,
                avatar_url: profile?.avatar_url || null,
                college: profile?.college || ONLY_COLLEGE,
              },
            };
            setAllPosts((prev) => { if (prev.some(p => p.id === hydratedPost.id)) return prev; return [hydratedPost, ...prev]; });
          }}
        />

        {!isAllowed('community_posting') ? (
          <div className="mx-4 my-2 rounded-md border border-accent-red/20 bg-accent-red/15 px-4 py-3 text-sm font-semibold text-accent-red">
            You cannot post at this time.
          </div>
        ) : null}

        {/* Posts */}
        <div className="flex-1">
          {isLoading ? (
            <div className="space-y-3 px-4 py-5">
              {Array.from({ length: 4 }).map((_, index) => (
                <PostSkeleton key={`community-post-skeleton-${index}`} />
              ))}
            </div>
          ) : posts.length > 0 ? (
            <div className="space-y-0">
              {posts.map((post) => (
                <FeedPost
                  key={post.id}
                  post={post}
                  profile={profile}
                  onLike={handleLike}
                  onDelete={handleDeletePost}
                  onReportPost={handleReportPost}
                  onReportAccount={handleReportAccount}
                  onOpenImage={(images, index) => setLightbox({ images, index })}
                  followingIds={followingIds}
                  onFollowChange={handleFollowChange}
                  onCommentAdded={(postId) => {
                    setPosts(prev => prev.map(p => p.id === postId ? { ...p, comments_count: (p.comments_count || 0) + 1 } : p));
                    setAllPosts(prev => prev.map(p => p.id === postId ? { ...p, comments_count: (p.comments_count || 0) + 1 } : p));
                  }}
                  onBookmarkChange={(postId, bookmarked) => {
                    setPosts(prev => prev.map(p => p.id === postId ? { ...p, user_has_bookmarked: bookmarked, bookmarks_count: Math.max(0, (p.bookmarks_count || 0) + (bookmarked ? 1 : -1)) } : p));
                    setAllPosts(prev => prev.map(p => p.id === postId ? { ...p, user_has_bookmarked: bookmarked, bookmarks_count: Math.max(0, (p.bookmarks_count || 0) + (bookmarked ? 1 : -1)) } : p));
                  }}
                />
              ))}
            </div>
          ) : (
            activeTab === 'Following' && noFollows ? (
              <div className="px-6 py-16 text-center">
                <Users className="mx-auto mb-3 h-10 w-10 text-[var(--text-secondary)]" />
                <h2 className="font-syne text-xl font-extrabold text-[var(--text-primary)]">Follow students to see their posts</h2>
                <p className="mt-2 text-sm text-[var(--text-secondary)]">Search for students and follow them to build your feed.</p>
                <button
                  onClick={() => navigate('/search')}
                  className="mt-4 inline-flex items-center gap-2 rounded-full bg-[var(--yellow)] px-4 py-2 text-sm font-bold text-[var(--text-primary)] hover:bg-[var(--yellow)] hover:text-[var(--text-primary)] transition"
                >
                  <Search className="h-4 w-4" /> Search for students
                </button>
              </div>
            ) : (
              <div className="px-6 py-20 text-center">
                <h2 className="font-syne text-2xl font-extrabold text-[var(--text-primary)]">Nothing here yet</h2>
                <p className="mt-2 text-sm text-[var(--text-secondary)]">{activeTab === 'Following' ? 'The people you follow haven\'t posted recently.' : 'Be the first person to publish in this lane.'}</p>
              </div>
            )
          )}
        </div>
      </div>

      {/* Right Sidebar */}
      <div className="hidden lg:block w-[340px] pl-6 py-4 min-h-screen">
        <div className="sticky top-6 space-y-4">
          {/* Welcome Card */}
          <div className="bg-surface rounded-2xl p-5 border border-border-subtle shadow-[0_2px_12px_rgba(0,0,0,0.04)]">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-full overflow-hidden border border-border-subtle bg-surface shrink-0">
                <img src={profile?.avatar_url || getAvatarDataUrl({ name: profile?.name, seed: profile?.id })} alt={profile?.name || 'User'} className="h-full w-full object-cover" />
              </div>
              <div className="min-w-0">
                <h3 className="font-syne font-bold text-base text-text-primary truncate">Hello {profile?.name?.split(' ')[0] || 'Mayank'}</h3>
                <p className="text-xs text-text-secondary">Welcome to Campus Community</p>
              </div>
            </div>
            <button
              onClick={() => setComposerExpanded(true)}
              className="mt-4 w-full flex items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm py-2.5 shadow-xs transition-colors"
            >
              <Plus className="h-4 w-4" strokeWidth={2.2} />
              Create post
            </button>
          </div>

          {/* What's happening Card */}
          <div className="bg-surface rounded-2xl p-5 border border-border-subtle shadow-[0_2px_12px_rgba(0,0,0,0.04)]">
            <h2 className="font-syne font-bold text-base text-text-primary mb-3.5">What's happening</h2>
            <div className="space-y-3.5">
              <div className="cursor-pointer group">
                <p className="text-xs font-medium text-text-secondary/70">Trending in Campus</p>
                <div className="flex items-center justify-between mt-0.5">
                  <p className="font-bold text-sm text-text-primary group-hover:text-blue-600 transition-colors">#Hackathon2024</p>
                  <span className="text-[11px] font-semibold text-accent-blue bg-accent-blue-soft px-2 py-0.5 rounded-full">Trending</span>
                </div>
                <p className="text-xs text-text-secondary mt-0.5">2,543 posts</p>
              </div>
              <div className="border-t border-border-subtle pt-3 cursor-pointer group">
                <p className="text-xs font-medium text-text-secondary/70">Technology Â· Trending</p>
                <p className="font-bold text-sm text-text-primary group-hover:text-blue-600 transition-colors mt-0.5">React 19</p>
                <p className="text-xs text-text-secondary mt-0.5">15K posts</p>
              </div>
            </div>
          </div>

          {/* Filter by college Card */}
          <div className="bg-surface rounded-2xl p-5 border border-border-subtle shadow-[0_2px_12px_rgba(0,0,0,0.04)]">
            <h2 className="font-syne font-bold text-base text-text-primary mb-3">Filter by college</h2>
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => setCollegeFilter('all')}
                className={`rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all ${
                  collegeFilter === 'all'
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : 'bg-surface text-text-secondary border border-border-subtle hover:bg-surface-elevated'
                }`}
              >
                All
              </button>
              {collegeOptions.map((college) => (
                <button
                  key={college}
                  onClick={() => setCollegeFilter(college)}
                  className={`rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all ${
                    collegeFilter === college
                      ? 'bg-blue-600 text-white shadow-2xs'
                      : 'bg-surface text-text-secondary border border-border-subtle hover:bg-surface-elevated'
                  }`}
                >
                  {college.includes('(MAIT)') ? 'MAIT' : college}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {lightbox ? (
        <ImageLightbox
          images={lightbox.images}
          index={lightbox.index}
          onClose={() => setLightbox(null)}
          onNavigate={(index) => setLightbox((current) => (current ? { ...current, index } : current))}
        />
      ) : null}

      {reportModal ? (
        <div className="fixed inset-0 z-[130] flex items-center justify-center bg-[var(--bg)]/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-black/10 bg-[var(--bg)] p-5">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-syne text-xl font-bold text-[var(--text-primary)]">Report {reportModal.targetType === 'post' ? 'post' : 'account'}</h3>
              <button onClick={() => !isSubmittingReport && setReportModal(null)} className="rounded-full p-2 text-[var(--text-secondary)] hover:bg-[#000000]/5 transition"><X className="h-5 w-5" /></button>
            </div>

            <label className="block text-sm font-bold text-[var(--text-primary)]">
              Reason
              <input
                value={reportReason}
                onChange={(event) => setReportReason(event.target.value)}
                placeholder="spam, abuse, harassment..."
                className="mt-2 w-full rounded-xl border border-black/10 bg-[var(--bg-secondary)] px-4 py-3 text-[15px] text-[var(--text-primary)] outline-none focus:border-[var(--text-primary)] transition"
              />
            </label>

            <label className="mt-4 block text-sm font-bold text-[var(--text-primary)]">
              Details (optional)
              <textarea
                value={reportDetails}
                onChange={(event) => setReportDetails(event.target.value)}
                rows={4}
                placeholder="Tell admin what happened"
                className="mt-2 w-full resize-none rounded-xl border border-black/10 bg-[var(--bg-secondary)] px-4 py-3 text-[15px] text-[var(--text-primary)] outline-none focus:border-[var(--text-primary)] transition"
              />
            </label>

            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setReportModal(null)} className="rounded-full border border-black/10 px-5 py-2 text-[15px] font-bold text-[var(--text-primary)] hover:bg-[#000000]/5 transition">Cancel</button>
              <button
                onClick={submitReport}
                disabled={isSubmittingReport}
                className="rounded-full bg-[var(--yellow)] px-5 py-2 text-[15px] font-bold text-[var(--text-primary)] disabled:opacity-60 hover:bg-[var(--yellow)] hover:text-[var(--text-primary)] transition"
              >
                {isSubmittingReport ? 'Submitting...' : 'Submit report'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

const InlinePostComposer = ({
  profile,
  canPost,
  initialType = 'discussion',
  expanded,
  onExpandedChange,
  onCreated,
}: {
  profile: any;
  canPost: boolean;
  initialType?: string;
  expanded: boolean;
  onExpandedChange: (value: boolean) => void;
  onCreated: (post: any) => void;
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [formData, setFormData] = useState({ content: '', type: initialType, isAnonymous: false });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!expanded) return;
    const handlePointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node) && !formData.content.trim()) {
        onExpandedChange(false);
      }
    };
    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [expanded, formData.content, onExpandedChange]);

  const getImageSize = (file: File) => new Promise<{ width: number; height: number }>((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.width, height: img.height });
      URL.revokeObjectURL(url);
    };
    img.onerror = () => {
      reject(new Error('Could not read image dimensions.'));
      URL.revokeObjectURL(url);
    };
    img.src = url;
  });

  const handleSubmit = async () => {
    if (!profile?.id) return;
    if (!canPost) {
      toast.error('Community posting is currently restricted for your account.');
      return;
    }
    if (!formData.content.trim()) {
      toast.error('Content is required.');
      return;
    }

    setIsSubmitting(true);
    const toastId = toast.loading('Publishing post...');

    const payload = {
      author_id: profile.id,
      college: profile.college || ONLY_COLLEGE,
      title: '',
      content: formData.content,
      type: formData.type,
      is_anonymous: formData.isAnonymous,
    };

    const { data, error } = await createPost(payload, files.length ? files : undefined);
    if (error) toast.error(error.message || 'Failed to publish post.', { id: toastId });
    else if (data) {
      toast.success(formData.isAnonymous ? 'Post published.' : '2 Reputation added for posting â­', { id: toastId });
      onCreated(data);
      setFormData({ content: '', type: formData.type, isAnonymous: false });
      setFiles([]);
      onExpandedChange(false);
    }
    setIsSubmitting(false);
  };

  const appendFiles = async (incoming: FileList | null) => {
    if (!incoming || incoming.length === 0) return;

    const capacity = Math.max(0, 4 - files.length);
    if (capacity === 0) {
      toast('Only 4 images are allowed per post.', { icon: 'â„¹ï¸' });
      return;
    }

    const accepted: File[] = [];
    for (const file of Array.from(incoming)) {
      if (accepted.length >= capacity) break;

      if (!COMMUNITY_ALLOWED_TYPES.includes(file.type)) {
        toast.error(`${file.name}: only JPG, PNG, and GIF are allowed.`);
        continue;
      }

      const sizeLimit = file.type === 'image/gif' ? COMMUNITY_GIF_MAX_BYTES : COMMUNITY_IMAGE_MAX_BYTES;
      if (file.size > sizeLimit) {
        toast.error(`${file.name}: file is too large.`);
        continue;
      }

      try {
        const dimensions = await getImageSize(file);
        if (dimensions.width < COMMUNITY_IMAGE_MIN_WIDTH) {
          toast.error(`${file.name}: minimum width is ${COMMUNITY_IMAGE_MIN_WIDTH}px.`);
          continue;
        }
      } catch {
        toast.error(`${file.name}: invalid image file.`);
        continue;
      }

      accepted.push(file);
    }

    const next = [...files, ...accepted].slice(0, 4);
    if (files.length + incoming.length > 4) {
      toast('Only 4 images are allowed per post.', { icon: 'â„¹ï¸' });
    }
    setFiles(next);
  };

  const getAvatarDataUrl = ({ name, seed }: { name?: string; seed?: string }) => {
    return 'https://ui-avatars.com/api/?name=User&background=1d9bf0&color=fff';
  };

  return (
    <div ref={rootRef} className="md:p-4 md:border-b md:border-black/10 flex gap-3 max-md:bg-white max-md:px-4 max-md:py-5 max-md:shadow-[0_4px_24px_rgb(0,0,0,0.03)] max-md:mb-2 max-md:rounded-b-[24px]">
      <div 
        className="w-10 h-10 md:rounded-full max-md:rounded-[14px] md:bg-[var(--bg-secondary)] max-md:bg-slate-50 flex-shrink-0 flex items-center justify-center text-slate-400 md:text-text-secondary/70 font-bold overflow-hidden cursor-pointer md:border md:border-black/10 max-md:shadow-sm" 
        onClick={() => onExpandedChange(true)}
      >
        <img src={profile?.avatar_url || getAvatarDataUrl({ name: profile?.name, seed: profile?.id || profile?.email })} alt="avatar" className="h-full w-full object-cover" />
      </div>

      <div className="flex-1 flex flex-col">
        <textarea
          value={formData.content}
          onFocus={() => onExpandedChange(true)}
          onChange={(event) => {
            setFormData({ ...formData, content: event.target.value });
            if (!expanded) onExpandedChange(true);
          }}
          placeholder="What is happening?!"
          rows={expanded ? 3 : 2}
          className="w-full bg-transparent text-[17px] md:text-[20px] leading-[24px] outline-none resize-none min-h-[50px] text-slate-900 md:text-[var(--text-primary)] placeholder-slate-400 md:placeholder-[var(--text-muted)] focus:ring-0 max-md:focus:bg-slate-50/50 max-md:rounded-xl max-md:px-1 max-md:-ml-1 max-md:transition-colors"
        />

        {files.length > 0 ? (
          <div className="mt-2 grid grid-cols-2 gap-2">
            {files.map((file, index) => (
              <div key={`${file.name}-${index}`} className="relative aspect-video overflow-hidden rounded-[16px] border border-black/10 bg-[var(--bg-secondary)]">
                <img src={URL.createObjectURL(file)} alt={`Attachment ${index + 1}`} className="h-full w-full object-cover" />
                <button type="button" onClick={() => setFiles((prev) => prev.filter((_, i) => i !== index))} className="absolute right-2 top-2 rounded-full bg-[var(--bg)]/75 p-1.5 text-[var(--text-primary)] backdrop-blur-md hover:bg-[var(--bg)] transition"><X className="h-4 w-4" /></button>
              </div>
            ))}
          </div>
        ) : null}

        {expanded ? (
          <>
            <div className="flex justify-between items-center mt-2">
              <div className="flex gap-1 text-[var(--text-primary)]">
                <button type="button" onClick={() => fileInputRef.current?.click()} className="p-2 hover:bg-[var(--bg-secondary)] rounded-full transition relative group">
                  <ImageIcon size={20} />
                  <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-[var(--text-muted)] text-[var(--text-primary)] text-[10px] px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none">Media</span>
                </button>
                <label className="p-2 hover:bg-[var(--bg-secondary)] rounded-full transition cursor-pointer relative group flex items-center justify-center">
                  <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-[var(--text-muted)] text-[var(--text-primary)] text-[10px] px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none">
                    {formData.isAnonymous ? 'Anonymous ON' : 'Post Anonymously'}
                  </span>
                  <div className={`w-5 h-5 rounded flex items-center justify-center border-2 ${formData.isAnonymous ? 'border-green-500 bg-green-500/20' : 'border-[var(--text-primary)]'}`}>
                    {formData.isAnonymous && <span className="text-accent-green text-xs">âœ“</span>}
                  </div>
                  <input type="checkbox" className="hidden" checked={formData.isAnonymous} onChange={() => setFormData({ ...formData, isAnonymous: !formData.isAnonymous })} />
                </label>
              </div>
              <div className="flex items-center gap-4">
                {formData.content.length > 0 && (
                  <span className={`text-sm ${formData.content.length > 900 ? 'text-accent-red' : 'text-[var(--text-primary)]'}`}>
                    {formData.content.length}/1000
                  </span>
                )}
                <button 
                  type="button" 
                  disabled={isSubmitting || !formData.content.trim()} 
                  onClick={() => void handleSubmit()} 
                  className="bg-[var(--yellow)] hover:bg-[var(--yellow)] hover:text-[var(--text-primary)] text-[var(--text-primary)] font-bold py-1.5 px-4 rounded-full transition disabled:opacity-60"
                >
                  {isSubmitting ? 'Posting...' : 'Post'}
                </button>
              </div>
            </div>
          </>
        ) : null}
      </div>
      <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/gif,image/webp" multiple onChange={(event) => { void appendFiles(event.target.files); event.target.value = ''; }} className="hidden" />
    </div>
  );
};

