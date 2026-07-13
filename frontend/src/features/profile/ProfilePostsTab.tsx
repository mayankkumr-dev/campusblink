import React from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Heart,
  Link2,
  MessageCircle,
  MoreHorizontal,
  Star,
  X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { getDisplayHandle } from '../../lib/user';
import { getAvatarDataUrl } from '../../lib/avatar';
import { AdaptivePostImage } from '../../app/components/AdaptivePostImage';
import { ProfileSkeleton } from '../../app/components/ui/Skeletons';

const POST_IMAGE_DELIMITER = '|||';

export function formatRelativeTime(value: string) {
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

export function parsePostImageUrls(post: any): string[] {
  if (Array.isArray(post?.image_urls) && post.image_urls.length > 0) {
    return post.image_urls.filter(Boolean);
  }

  const value = post?.image_url;
  if (!value || typeof value !== 'string') return [];

  if (value.includes(POST_IMAGE_DELIMITER)) {
    return value
      .split(POST_IMAGE_DELIMITER)
      .map((entry) => entry.trim())
      .filter(Boolean);
  }

  return [value];
}

export function PostCard({
  post,
  viewerProfile,
  onLike,
  onOpenImage,
}: {
  post: any;
  viewerProfile: any;
  onLike: (postId: string, likedByMe: boolean) => void;
  onOpenImage: (images: string[], index: number) => void;
}) {
  const likedByMe = Boolean(viewerProfile?.id && post.liked_by?.includes(viewerProfile.id));
  const displayName = post.is_anonymous
    ? 'Anonymous Student'
    : post.author?.name || viewerProfile?.name || 'Campus Student';
  const handle = post.is_anonymous
    ? 'anonymous'
    : getDisplayHandle(post.author?.username || viewerProfile?.username, 'student');
  const avatar = post.is_anonymous
    ? null
    : post.author?.avatar_url ||
      viewerProfile?.avatar_url ||
      getAvatarDataUrl({
        name: post.author?.name || viewerProfile?.name,
        seed: post.author?.id || post.author_id || post.id,
      });
  const images = parsePostImageUrls(post);

  const handleCopyPostLink = async () => {
    const base = typeof window !== 'undefined' ? window.location.origin : '';
    const link = `${base}/community/${post.id}`;
    try {
      await navigator.clipboard.writeText(link);
      toast.success('Post link copied.');
    } catch {
      toast.error('Could not copy link.');
    }
  };

  return (
    <article className="border-b border-border-subtle px-6 py-5 bg-surface transition-colors hover:bg-slate-50/60">
      <div className="flex gap-4">
        <div className="mt-0.5 h-11 w-11 shrink-0 overflow-hidden rounded-full border border-border-subtle bg-surface shadow-2xs">
          {avatar ? (
            <img
              loading="lazy"
              src={avatar}
              alt={displayName}
              className="h-full w-full rounded-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-sm font-bold text-text-primary bg-surface-elevated">
              ?
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                <span className="truncate font-syne font-bold text-text-primary">{displayName}</span>
                <span className="text-text-secondary font-medium">@{handle}</span>
                <span className="text-text-placeholder">·</span>
                <span className="text-xs text-text-secondary/70">
                  {formatRelativeTime(post.created_at)}
                </span>
                {post.is_anonymous && (
                  <span className="rounded-full bg-surface-elevated px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-text-secondary">
                    Anonymous 🔒
                  </span>
                )}
                {post.author?.college && !post.is_anonymous && (
                  <span className="rounded-full bg-accent-blue-soft border border-accent-blue-soft px-2.5 py-0.5 text-[10px] font-semibold text-blue-700">
                    {post.author.college.includes('(MAIT)') ? 'MAIT' : post.author.college}
                  </span>
                )}
              </div>
              {post.title && (
                <h3 className="mt-1.5 text-base font-bold text-text-primary">{post.title}</h3>
              )}
            </div>

            <button className="flex h-8 w-8 items-center justify-center rounded-lg text-text-secondary/70 transition-colors hover:bg-surface-elevated hover:text-slate-700">
              <MoreHorizontal className="h-4 w-4" strokeWidth={1.5} />
            </button>
          </div>

          <p className="mt-2 whitespace-pre-wrap text-[15px] leading-relaxed text-text-primary font-normal">
            {post.content}
          </p>

          {images.length > 0 &&
            (images.length === 1 ? (
              <div className="mt-3.5 overflow-hidden rounded-2xl border border-border-subtle bg-surface">
                <AdaptivePostImage
                  src={images[0]}
                  alt="Post attachment"
                  onClick={() => onOpenImage(images, 0)}
                  className="w-full max-h-[500px] bg-surface"
                  imgClassName="h-full w-full object-contain"
                />
              </div>
            ) : (
              <div className="mt-3.5 grid grid-cols-2 gap-1.5 overflow-hidden rounded-2xl border border-border-subtle bg-surface">
                {images.slice(0, 4).map((image, index) => (
                  <AdaptivePostImage
                    key={`${image}-${index}`}
                    src={image}
                    alt={`Post attachment ${index + 1}`}
                    onClick={() => onOpenImage(images, index)}
                    className="bg-surface-elevated"
                    imgClassName="h-full w-full object-contain"
                  >
                    {images.length > 4 && index === 3 ? (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-xl font-bold text-white">
                        +{images.length - 4}
                      </div>
                    ) : null}
                  </AdaptivePostImage>
                ))}
              </div>
            ))}

          <div className="mt-4 flex max-w-md items-center justify-between text-text-secondary pt-1">
            <button
              onClick={() => onLike(post.id, likedByMe)}
              className={`group flex items-center gap-1.5 text-xs font-medium transition-colors ${
                likedByMe ? 'text-accent-red' : 'hover:text-rose-600'
              }`}
            >
              <span
                className={`flex h-8 px-2.5 items-center justify-center rounded-xl transition-all ${
                  likedByMe ? 'bg-accent-red/15 text-accent-red' : 'group-hover:bg-rose-50'
                }`}
              >
                <Heart
                  className={`h-4 w-4 mr-1.5 ${likedByMe ? 'fill-current' : ''}`}
                  strokeWidth={1.5}
                />
                {post.likes_count || 0}
              </span>
            </button>

            <button className="group flex items-center gap-1.5 text-xs font-medium transition-colors hover:text-blue-600">
              <span className="flex h-8 px-2.5 items-center justify-center rounded-xl transition-all group-hover:bg-blue-50">
                <MessageCircle className="h-4 w-4 mr-1.5" strokeWidth={1.5} />
                {post.comments_count || 0}
              </span>
            </button>

            <button
              onClick={handleCopyPostLink}
              className="group flex items-center gap-1.5 text-xs font-medium transition-colors hover:text-slate-800"
            >
              <span className="flex h-8 px-2.5 items-center justify-center rounded-xl transition-all group-hover:bg-surface-elevated">
                <Link2 className="h-4 w-4 mr-1.5" strokeWidth={1.5} />
                Share
              </span>
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}

export interface ProfilePostsTabProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  isLoadingContent: boolean;
  content: any[];
  viewerProfile: any;
  onLike: (postId: string, likedByMe: boolean) => void;
  lightbox: { images: string[]; index: number } | null;
  onOpenImage: (images: string[], index: number) => void;
  onCloseLightbox: () => void;
  onNavigateCreatePost: () => void;
}

export const ProfilePostsTab: React.FC<ProfilePostsTabProps> = ({
  activeTab,
  onTabChange,
  isLoadingContent,
  content,
  viewerProfile,
  onLike,
  lightbox,
  onOpenImage,
  onCloseLightbox,
  onNavigateCreatePost,
}) => {
  return (
    <>
      {/* Navigation Tabs: Posts, Replies, Likes */}
      <div className="border-b border-border-subtle px-6 bg-surface sticky top-14 z-20">
        <div className="flex gap-6">
          {['posts', 'replies', 'likes'].map((tab) => (
            <button
              key={tab}
              onClick={() => onTabChange(tab)}
              className={`relative py-3.5 text-sm font-semibold capitalize transition-all duration-150 ${
                activeTab === tab
                  ? 'text-accent-blue border-b-2 border-blue-600'
                  : 'text-text-secondary hover:text-text-primary border-b-2 border-transparent'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Content Feed Section */}
      <div className="bg-surface">
        <div className="min-h-[260px] transition-opacity duration-200">
          {isLoadingContent ? (
            <div className="py-6 px-6">
              <ProfileSkeleton />
            </div>
          ) : content.length > 0 ? (
            <div className="divide-y divide-slate-100">
              {content.map((item) => (
                <div key={`${activeTab}-${item.id}`}>
                  {activeTab === 'replies' && item.reply_content ? (
                    <div className="px-6 pt-4 text-xs font-medium text-text-secondary bg-background">
                      Replied: <span className="text-text-primary italic">"{item.reply_content}"</span>
                    </div>
                  ) : null}
                  <PostCard
                    post={item}
                    viewerProfile={viewerProfile}
                    onLike={onLike}
                    onOpenImage={onOpenImage}
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="py-20 text-center px-6">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-surface border border-border-subtle text-text-secondary/70 shadow-2xs">
                {activeTab === 'posts' ? (
                  <Star className="h-5 w-5" />
                ) : activeTab === 'replies' ? (
                  <MessageCircle className="h-5 w-5" />
                ) : (
                  <Heart className="h-5 w-5" />
                )}
              </div>
              <h3 className="text-base font-bold text-text-primary">No {activeTab} yet</h3>
              <p className="mt-1 text-sm text-text-secondary">
                Your {activeTab} activity will appear here.
              </p>
              {activeTab === 'posts' ? (
                <button
                  className="mt-5 rounded-xl border border-border-subtle bg-surface px-5 py-2.5 text-xs font-semibold text-text-primary shadow-2xs transition-all hover:bg-surface-elevated"
                  onClick={onNavigateCreatePost}
                >
                  Create a Post
                </button>
              ) : null}
            </div>
          )}
        </div>
      </div>

      {lightbox ? (
        <div
          className="fixed inset-0 z-[90] flex items-center justify-center bg-black/80 p-4"
          onClick={onCloseLightbox}
        >
          <button
            onClick={onCloseLightbox}
            className="absolute right-4 top-4 z-10 rounded-md bg-[var(--bg)]/10 p-2 text-white hover:bg-[var(--bg)]/20"
          >
            <X className="h-6 w-6" />
          </button>
          {lightbox.images.length > 1 ? (
            <>
              <button
                onClick={(event) => {
                  event.stopPropagation();
                  onOpenImage(
                    lightbox.images,
                    (lightbox.index - 1 + lightbox.images.length) % lightbox.images.length
                  );
                }}
                className="absolute left-4 top-1/2 z-10 -translate-y-1/2 rounded-md bg-[var(--bg)]/10 p-2 text-white hover:bg-[var(--bg)]/20"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
              <button
                onClick={(event) => {
                  event.stopPropagation();
                  onOpenImage(
                    lightbox.images,
                    (lightbox.index + 1) % lightbox.images.length
                  );
                }}
                className="absolute right-4 top-1/2 z-10 -translate-y-1/2 rounded-md bg-[var(--bg)]/10 p-2 text-white hover:bg-[var(--bg)]/20"
              >
                <ChevronRight className="h-6 w-6" />
              </button>
            </>
          ) : null}
          <img
            loading="lazy"
            onClick={(event) => event.stopPropagation()}
            src={
              lightbox.images[
                Math.max(0, Math.min(lightbox.index, lightbox.images.length - 1))
              ]
            }
            alt="Expanded attachment"
            className="max-h-[92vh] max-w-[92vw] rounded-lg object-contain"
          />
        </div>
      ) : null}
    </>
  );
};
