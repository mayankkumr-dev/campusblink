import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import { ArrowLeft, Calendar, ExternalLink, Loader2, MapPin, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../store/authStore';
import { reportContent } from '../../api/community';
import { getProfileSocialLinks } from '../../api/profileSocialLinks';
import { checkIsFollowing, getFollowStats } from '../../api/follow';
import { supabase } from '../../lib/supabase';
import { getAvatarDataUrl } from '../../lib/avatar';
import { getDisplayHandle } from '../../lib/user';
import { AdaptivePostImage } from './AdaptivePostImage';
import { SocialLinksStrip, mergeSocialLinks } from './ProfileSocialLinks';
import { FollowButton } from './FollowButton';
import { FollowListModal } from './FollowListModal';

const POST_IMAGE_DELIMITER = '|||';
const DEFAULT_BANNER_IMAGE_URL = '/banner-background.png';

function formatRelativeTime(value: string) {
  const date = new Date(value);
  const diff = Date.now() - date.getTime();
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;
  if (diff < hour) return `${Math.max(1, Math.floor(diff / minute))}m`;
  if (diff < day) return `${Math.max(1, Math.floor(diff / hour))}h`;
  if (diff < 7 * day) return `${Math.max(1, Math.floor(diff / day))}d`;
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function parsePostImageUrls(post: any): string[] {
  if (Array.isArray(post?.image_urls) && post.image_urls.length > 0) return post.image_urls.filter(Boolean);
  const value = post?.image_url;
  if (!value || typeof value !== 'string') return [];
  if (value.includes(POST_IMAGE_DELIMITER)) return value.split(POST_IMAGE_DELIMITER).map((e) => e.trim()).filter(Boolean);
  return [value];
}

export const UserProfilePage: React.FC = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const currentProfile = useAuthStore((state) => state.profile);

  const [targetProfile, setTargetProfile] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [socialLinks, setSocialLinks] = useState<Array<{ platform: string; url: string }>>([]);
  const [peopleModal, setPeopleModal] = useState<'followers' | 'following' | null>(null);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reportDetails, setReportDetails] = useState('');
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const [imageModal, setImageModal] = useState<{ src: string; title: string } | null>(null);

  // Redirect to own profile if viewing self
  useEffect(() => {
    if (userId && currentProfile?.id && userId === currentProfile.id) {
      navigate('/student/profile', { replace: true });
    }
  }, [userId, currentProfile?.id, navigate]);

  useEffect(() => {
    if (!userId) {
      setNotFound(true);
      setIsLoading(false);
      return;
    }

    let mounted = true;

    const load = async () => {
      setIsLoading(true);

      const safeUserId = String(userId).trim();

      const { data: profileData } = await supabase
        .from('profiles')
        .select('id, name, avatar_url, cover_url, bio, college, username, location, website, created_at, campus_credits, followers_count, following_count')
        .or(`id.eq.${safeUserId},username.eq.${safeUserId}`)
        .maybeSingle();

      if (!mounted) return;

      if (!profileData) {
        setNotFound(true);
      } else {
        setTargetProfile(profileData);
        setFollowerCount(profileData.followers_count || 0);
        setFollowingCount(profileData.following_count || 0);
        const { data: postsData } = await supabase
          .from('posts')
          .select('*, author:profiles!author_id(id, name, avatar_url, username, college), post_likes!left(user_id)')
          .eq('author_id', profileData.id)
          .eq('is_anonymous', false)
          .order('created_at', { ascending: false });

        if (!mounted) return;

        const normalizedPosts = (postsData || []).map((p: any) => ({
          ...p,
          likes_count: p.likes_count ?? p.upvotes ?? 0,
          liked_by: Array.isArray(p.post_likes) ? p.post_likes.map((l: any) => l.user_id) : [],
        }));
        setPosts(normalizedPosts);
      }

      const { data: socialLinkData } = await getProfileSocialLinks(userId);
      if (mounted) {
        setSocialLinks((socialLinkData || []).map((item: any) => ({ platform: item.platform || 'website', url: item.url || '' })));
      }

      if (mounted) setIsLoading(false);
    };

    load();

    return () => { mounted = false; };
  }, [userId]);

  // Check follow status
  useEffect(() => {
    if (!currentProfile?.id || !userId || currentProfile.id === userId) return;
    let mounted = true;
    checkIsFollowing(currentProfile.id, userId).then(({ isFollowing: f }) => {
      if (mounted) setIsFollowing(f);
    });
    return () => { mounted = false; };
  }, [currentProfile?.id, userId]);

  useEffect(() => {
    if (!userId) return;

    let mounted = true;
    getFollowStats(userId).then(({ data }) => {
      if (!mounted || !data) return;
      setFollowerCount(data.followers_count || 0);
      setFollowingCount(data.following_count || 0);
    });

    return () => {
      mounted = false;
    };
  }, [userId, isFollowing]);

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#0D0D0D]" />
      </div>
    );
  }

  if (notFound || !targetProfile) {
    return (
      <div className="px-4 py-12 text-center">
        <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-md bg-[#FFD600]/20 text-4xl">(=^.^=)</div>
        <h2 className="font-syne text-2xl font-extrabold text-[#0D0D0D]">User not found</h2>
        <p className="mt-2 text-sm text-[#6B6B6B]">This profile doesn't exist or was removed.</p>
        <button onClick={() => navigate(-1)} className="mt-5 inline-flex items-center gap-2 rounded-md bg-[#0D0D0D] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#FFD600] hover:text-[#0D0D0D]">
          <ArrowLeft className="h-4 w-4" /> Go back
        </button>
      </div>
    );
  }

  const avatar = targetProfile.avatar_url || getAvatarDataUrl({ name: targetProfile.name, seed: targetProfile.id });
  const visibleSocialLinks = mergeSocialLinks(targetProfile.website, socialLinks);

  const handleReportAccount = () => {
    if (!currentProfile?.id || !targetProfile?.id) {
      toast.error('Please log in to report this account.');
      return;
    }
    if (currentProfile.id === targetProfile.id) {
      toast.error('You cannot report your own account.');
      return;
    }

    setReportReason('');
    setReportDetails('');
    setIsReportModalOpen(true);
  };

  const submitAccountReport = async () => {
    if (!currentProfile?.id || !targetProfile?.id) return;

    const reason = reportReason.trim();
    if (!reason) {
      toast.error('Reason is required.');
      return;
    }

    setIsSubmittingReport(true);
    const loadingToast = toast.loading('Submitting report...');
    const { error } = await reportContent('profile', targetProfile.id, currentProfile.id, reason, reportDetails.trim() || null);

    if (error) {
      toast.error((error as any)?.message || 'Could not submit report.', { id: loadingToast });
      setIsSubmittingReport(false);
      return;
    }

    toast.success('Account reported. Admin will review it.', { id: loadingToast });
    setIsSubmittingReport(false);
    setIsReportModalOpen(false);
  };

  return (
    <>
    <div className="min-h-screen bg-[#FAFAF8] pb-24 text-[#0D0D0D]">
      <div className="mx-auto max-w-5xl px-4 pb-10 pt-4 md:px-6">
        {/* Back button */}
        <button onClick={() => navigate(-1)} className="mb-4 inline-flex items-center gap-2 rounded-md bg-white px-4 py-2 text-sm font-bold text-[#0D0D0D] shadow-sm border border-black/10 hover:bg-[#FAFAF8]">
          <ArrowLeft className="h-4 w-4" /> Back
        </button>

        <div className="overflow-hidden rounded-[36px] border border-black/10 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
          {/* Cover / Banner */}
          <div className="relative aspect-[4/1] min-h-[180px] w-full overflow-hidden bg-[#0D0D0D] md:min-h-[240px]">
            {targetProfile.cover_url ? (
              <img src={targetProfile.cover_url} alt="Profile banner" className="h-full w-full object-cover" />
            ) : (
              <img src={DEFAULT_BANNER_IMAGE_URL} alt="Default profile banner" className="h-full w-full object-cover" />
            )}
            <button
              type="button"
              onClick={() => setImageModal({ src: targetProfile.cover_url || DEFAULT_BANNER_IMAGE_URL, title: 'Cover photo' })}
              className="absolute inset-0 h-full w-full"
              aria-label="Open cover photo"
            />
            <div className="absolute inset-0 bg-[#FFFFFF]/35 via-black/10 to-transparent pointer-events-none" />
          </div>

          <div className="relative px-5 pb-8 md:px-8">
            <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
              <div className="flex flex-col md:flex-row md:items-end md:gap-6">
                <button
                  type="button"
                  onClick={() => setImageModal({ src: avatar, title: `${targetProfile.name} profile photo` })}
                  className="-mt-16 h-28 w-28 overflow-hidden rounded-[28px] border-[#E8E8E8] md:-mt-20 md:h-36 md:w-36"
                >
                  <img src={avatar} alt={targetProfile.name} className="h-full w-full object-cover" />
                </button>

                <div className="pt-4 md:pb-2">
                  <h1 className="font-syne text-3xl font-extrabold tracking-tight md:text-4xl">{targetProfile.name}</h1>
                  <p className="mt-1 text-[15px] text-[#6B6B6B]">@{getDisplayHandle(targetProfile.username, 'student')}</p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => setPeopleModal('following')}
                  className="rounded-md border border-black/10 bg-[#FAFAF8] px-4 py-2 text-sm font-bold text-[#0D0D0D]"
                >
                  {followingCount} Following
                </button>
                <button
                  type="button"
                  onClick={() => setPeopleModal('followers')}
                  className="rounded-md border border-black/10 bg-[#FAFAF8] px-4 py-2 text-sm font-bold text-[#0D0D0D]"
                >
                  {followerCount} Followers
                </button>
                {currentProfile?.id && currentProfile.id !== targetProfile.id && (
                  <>
                    <FollowButton
                      targetUserId={targetProfile.id}
                      initialFollowing={isFollowing}
                      onChange={(nextFollowing, counts) => {
                        setIsFollowing(nextFollowing);
                        if (typeof counts?.followers_count === 'number') {
                          setFollowerCount(counts.followers_count);
                        }
                      }}
                    />
                    <button
                      onClick={handleReportAccount}
                      className="rounded-md border border-[#CA8A04]/30 bg-[#FEF9C3] px-4 py-2 text-sm font-bold text-[#A16207] hover:bg-[#FDE68A]"
                    >
                      Report Account
                    </button>
                  </>
                )}
              </div>

              <SocialLinksStrip links={visibleSocialLinks} className="md:justify-end" />
            </div>

            <div className="mt-6">
              <p className="max-w-2xl whitespace-pre-wrap text-[15px] leading-7 text-[#222222]">
                {targetProfile.bio || "This user hasn't added a bio yet."}
              </p>

              <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-3 text-sm text-[#6B6B6B]">
                {targetProfile.location && (
                  <div className="flex items-center gap-2"><MapPin className="h-4 w-4" /><span>{targetProfile.location}</span></div>
                )}
                {targetProfile.website && (
                  <a href={`https://${targetProfile.website.replace(/^https?:\/\//, '')}`} target="_blank" rel="noreferrer" className="flex items-center gap-2 font-medium text-[#0D0D0D] transition-colors hover:text-[#0057FF]">
                    <ExternalLink className="h-4 w-4" />
                    <span>{targetProfile.website.replace(/^https?:\/\//, '')}</span>
                  </a>
                )}
                <div className="flex items-center gap-2"><Calendar className="h-4 w-4" /><span>Joined {new Date(targetProfile.created_at).toLocaleDateString([], { month: 'long', year: 'numeric' })}</span></div>
              </div>

            </div>
          </div>

          {/* Posts */}
          <div className="border-t border-black/10">
            <div className="px-5 py-4">
              <h2 className="font-syne text-xl font-extrabold text-[#0D0D0D]">Posts</h2>
            </div>

            {posts.length > 0 ? (
              posts.map((post) => {
                const postAvatar = post.author?.avatar_url || getAvatarDataUrl({ name: post.author?.name, seed: post.author?.id || post.author_id });
                const images = parsePostImageUrls(post);

                return (
                  <article
                    key={post.id}
                    onClick={() => navigate(`/community/${post.id}`)}
                    className="cursor-pointer border-b border-black/10 px-5 py-4 transition-colors hover:bg-black/[0.015]"
                  >
                    <div className="flex gap-3">
                      <div className="mt-1 h-10 w-10 shrink-0 overflow-hidden rounded-md border border-black/10 bg-[#F2F0EB]">
                        <img src={postAvatar} alt={post.author?.name || 'avatar'} className="h-full w-full object-cover" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                          <span className="font-bold text-[#0D0D0D]">{post.author?.name || targetProfile.name}</span>
                          <span className="text-[#6B6B6B]">·</span>
                          <span className="text-[#6B6B6B]">{formatRelativeTime(post.created_at)}</span>
                          {post.author?.college && (
                            <span className="rounded-md bg-[#FFD600]/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.15em] text-[#0D0D0D]">
                              {post.author.college.includes('(MAIT)') ? 'MAIT' : post.author.college}
                            </span>
                          )}
                        </div>
                        {post.title && <h3 className="mt-1 text-base font-bold text-[#0D0D0D]">{post.title}</h3>}
                        <p className="community-post-content mt-1 text-[14px] leading-6 text-[#222222] line-clamp-3">{post.content}</p>
                        {images.length > 0 && (
                          images.length === 1 ? (
                            <div className="mt-2 overflow-hidden rounded-[18px] border border-black/10 bg-[#F2F0EB]">
                              <AdaptivePostImage
                                src={images[0]}
                                alt="Post attachment"
                                className="w-full max-h-[360px] bg-[#F2F0EB]"
                                imgClassName="h-full w-full object-contain"
                              />
                            </div>
                          ) : (
                            <div className="mt-2 grid grid-cols-2 gap-1 overflow-hidden rounded-[18px] border border-black/10 bg-[#F2F0EB]">
                              {images.slice(0, 4).map((image, index) => (
                                <AdaptivePostImage
                                  key={`${image}-${index}`}
                                  src={image}
                                  alt={`Post attachment ${index + 1}`}
                                  className="bg-[#EDE9DF]"
                                  imgClassName="h-full w-full object-contain"
                                >
                                  {images.length > 4 && index === 3 ? (
                                    <div className="absolute inset-0 flex items-center justify-center bg-black/45 text-xl font-extrabold text-white">+{images.length - 4}</div>
                                  ) : null}
                                </AdaptivePostImage>
                              ))}
                            </div>
                          )
                        )}
                        <div className="mt-2 flex items-center gap-4 text-sm text-[#6B6B6B]">
                          <span>{post.comments_count || 0} comments</span>
                          <span>{post.likes_count || 0} likes</span>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })
            ) : (
              <div className="px-6 py-14 text-center">
                <h3 className="font-syne text-2xl font-extrabold text-[#0D0D0D]">No public posts yet</h3>
                <p className="mt-2 text-sm text-[#6B6B6B]">This user hasn't posted anything publicly.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>

      {isReportModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-[18px] border border-black/10 bg-white p-5 shadow-[0_18px_45px_rgba(0,0,0,0.2)]">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-syne text-xl font-bold text-[#0D0D0D]">Report account</h3>
              <button onClick={() => !isSubmittingReport && setIsReportModalOpen(false)} className="rounded-md p-1.5 text-[#6B6B6B] hover:bg-[#F5F4F0]">
                <X className="h-4 w-4" />
              </button>
            </div>

            <label className="block text-sm font-semibold text-[#0D0D0D]">
              Reason
              <input
                value={reportReason}
                onChange={(event) => setReportReason(event.target.value)}
                placeholder="spam, abuse, harassment..."
                className="mt-1 w-full rounded-md border border-black/10 bg-[#FAFAF8] px-3 py-2.5 text-sm outline-none focus:border-[#CA8A04]"
              />
            </label>

            <label className="mt-3 block text-sm font-semibold text-[#0D0D0D]">
              Details (optional)
              <textarea
                value={reportDetails}
                onChange={(event) => setReportDetails(event.target.value)}
                rows={4}
                placeholder="Tell admin what happened"
                className="mt-1 w-full resize-none rounded-md border border-black/10 bg-[#FAFAF8] px-3 py-2.5 text-sm outline-none focus:border-[#CA8A04]"
              />
            </label>

            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setIsReportModalOpen(false)} className="rounded-md border border-black/10 px-3 py-2 text-sm font-bold text-[#6B6B6B]">Cancel</button>
              <button
                onClick={submitAccountReport}
                disabled={isSubmittingReport}
                className="rounded-md bg-[#CA8A04] px-3 py-2 text-sm font-bold text-white disabled:opacity-60"
              >
                {isSubmittingReport ? 'Submitting...' : 'Submit report'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <FollowListModal
        userId={targetProfile?.id}
        openList={peopleModal}
        onClose={() => setPeopleModal(null)}
        currentUserId={currentProfile?.id}
        totalFollowers={followerCount}
        totalFollowing={followingCount}
      />

      {imageModal ? (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/80 p-4" onClick={() => setImageModal(null)}>
          <button onClick={() => setImageModal(null)} className="absolute right-4 top-4 z-10 rounded-md bg-white/10 p-2 text-white hover:bg-white/20"><X className="h-6 w-6" /></button>
          <img
            onClick={(event) => event.stopPropagation()}
            src={imageModal.src}
            alt={imageModal.title}
            className="max-h-[92vh] max-w-[92vw] rounded-lg object-contain"
          />
        </div>
      ) : null}
    </>
  );
};
