/**
 * FeedPost — Shared post card component used by CommunityFeed and SavedBookmarks.
 *
 * Extracted from CommunityFeed.tsx to avoid duplicating post-rendering logic.
 * Includes: author header, content, image grid, lightbox, action row (like, comment, share, bookmark),
 * inline reply modal, and admin debug info.
 */
import React, { useEffect, useRef, useState, Fragment } from 'react';
import { Bookmark, ChevronLeft, ChevronRight, Heart, Image as ImageIcon, Link2, MessageCircle, MoreHorizontal, Share2, X } from 'lucide-react';
import { Transition, Dialog } from '@headlessui/react';
import { useNavigate } from 'react-router';
import toast from 'react-hot-toast';
import { togglePostLike, addComment, togglePostBookmark } from '../../api/community';
import { getAvatarDataUrl } from '../../lib/avatar';
import { getDisplayHandle } from '../../lib/user';
import { AdaptivePostImage } from '../../app/components/AdaptivePostImage';
import { FollowButton } from '../../shared/components/FollowButton';
import { ProfilePictureInteract } from '../../app/components/ProfilePictureInteract';

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

export function parseImageUrls(post: any): string[] {
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

export function PostImageGrid({ images, onOpen }: { images: string[]; onOpen: (index: number) => void }) {
  if (!images.length) return null;

  if (images.length === 1) {
    return (
      <div className="mt-4 overflow-hidden md:rounded-[14px] max-md:rounded-[20px] md:border md:border-black/10 max-md:border-none md:bg-[var(--bg-secondary)] max-md:bg-slate-50 max-md:shadow-sm">
        <AdaptivePostImage
          src={images[0]}
          alt="Post attachment"
          onClick={(event) => {
            event.stopPropagation();
            onOpen(0);
          }}
          className="w-full max-h-[620px] bg-[var(--bg-secondary)]"
          imgClassName="h-full w-full object-contain"
        />
      </div>
    );
  }

  return (
    <div className="mt-4 grid grid-cols-2 gap-1 overflow-hidden md:rounded-[14px] max-md:rounded-[20px] md:border md:border-black/10 max-md:border-none md:bg-[var(--bg-secondary)] max-md:bg-slate-50 max-md:shadow-sm">
      {images.slice(0, 4).map((image, index) => (
        <AdaptivePostImage
          key={`${image}-${index}`}
          src={image}
          alt={`Post attachment ${index + 1}`}
          onClick={(event) => {
            event.stopPropagation();
            onOpen(index);
          }}
          className="bg-[var(--bg-tertiary)]"
          imgClassName="h-full w-full object-contain"
        >
          {images.length > 4 && index === 3 && (
            <div className="absolute inset-0 flex items-center justify-center bg-[var(--bg)]/45 text-2xl font-extrabold text-[var(--text-primary)]">+{images.length - 4}</div>
          )}
        </AdaptivePostImage>
      ))}
    </div>
  );
}

export function ImageLightbox({
  images,
  index,
  onClose,
  onNavigate,
}: {
  images: string[];
  index: number;
  onClose: () => void;
  onNavigate: (index: number) => void;
}) {
  const safeIndex = Math.max(0, Math.min(index, images.length - 1));

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-[var(--bg)]/80 p-4" onClick={onClose}>
      <button onClick={onClose} className="absolute right-4 top-4 z-10 rounded-md bg-[var(--bg)]/10 p-2 text-[var(--text-primary)] hover:bg-[var(--bg)]/20">
        <X className="h-6 w-6" />
      </button>
      {images.length > 1 ? (
        <>
          <button
            onClick={(event) => {
              event.stopPropagation();
              onNavigate((safeIndex - 1 + images.length) % images.length);
            }}
            className="absolute left-4 top-1/2 z-10 -translate-y-1/2 rounded-md bg-[var(--bg)]/10 p-2 text-[var(--text-primary)] hover:bg-[var(--bg)]/20"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          <button
            onClick={(event) => {
              event.stopPropagation();
              onNavigate((safeIndex + 1) % images.length);
            }}
            className="absolute right-4 top-1/2 z-10 -translate-y-1/2 rounded-md bg-[var(--bg)]/10 p-2 text-[var(--text-primary)] hover:bg-[var(--bg)]/20"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        </>
      ) : null}
      <img
        onClick={(event) => event.stopPropagation()}
        src={images[safeIndex]}
        alt="Expanded attachment"
        className="max-h-[92vh] max-w-[92vw] rounded-lg object-contain"
      />
    </div>
  );
}

export interface FeedPostProps {
  key?: React.Key;
  post: any;
  profile: any;
  onLike: (postId: string, likedByMe: boolean) => void;
  onDelete: (post: any) => void;
  onReportPost: (post: any) => void;
  onReportAccount: (post: any) => void;
  onOpenImage: (images: string[], index: number) => void;
  followingIds: Set<string>;
  onFollowChange: (userId: string, nextFollowing: boolean) => void;
  /** Called after a comment is successfully posted, so parent can update counts */
  onCommentAdded?: (postId: string) => void;
  /** Called when bookmark state changes, so parent can update local state */
  onBookmarkChange?: (postId: string, bookmarked: boolean) => void;
}

export function FeedPost({
  post,
  profile,
  onLike,
  onDelete,
  onReportPost,
  onReportAccount,
  onOpenImage,
  followingIds,
  onFollowChange,
  onCommentAdded,
  onBookmarkChange,
}: FeedPostProps) {
  const navigate = useNavigate();
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const likedByMe = Boolean(profile?.id && post.liked_by?.includes(profile.id));
  const isAnonymous = post.is_anonymous;
  const avatar = isAnonymous
    ? null
    : post.author?.avatar_url || getAvatarDataUrl({ name: post.author?.name, seed: post.author?.id || post.author_id || post.id });
  const handle = isAnonymous ? 'anonymous' : getDisplayHandle(post.author?.username, 'student');
  const images = parseImageUrls(post);
  const postLink = `${window.location.origin}/community/${post.id}`;
  const isAdmin = profile?.role === 'admin';

  const [showCommentModal, setShowCommentModal] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(post.user_has_bookmarked || false);
  const [localBookmarkCount, setLocalBookmarkCount] = useState(post.bookmarks_count || 0);

  // Sync bookmark state when post prop changes (e.g. realtime update)
  useEffect(() => {
    setIsBookmarked(post.user_has_bookmarked || false);
    setLocalBookmarkCount(post.bookmarks_count || 0);
  }, [post.user_has_bookmarked, post.bookmarks_count]);

  const handleBookmarkToggle = async (event?: React.MouseEvent) => {
    event?.stopPropagation();
    if (!profile?.id) {
      toast.error('Log in to bookmark');
      return;
    }
    const prev = isBookmarked;
    const prevCount = localBookmarkCount;
    // Optimistic update
    setIsBookmarked(!prev);
    setLocalBookmarkCount(prev ? Math.max(0, prevCount - 1) : prevCount + 1);

    const { error } = await togglePostBookmark(post.id, profile.id);
    if (error) {
      setIsBookmarked(prev);
      setLocalBookmarkCount(prevCount);
      toast.error('Failed to bookmark');
    } else {
      toast.success(prev ? 'Removed from Bookmarks' : 'Added to Bookmarks');
      onBookmarkChange?.(post.id, !prev);
    }
  };

  const isOwnPost = Boolean(profile?.id && post.author_id === profile.id);
  const canReportPost = Boolean(profile?.id && !isOwnPost);
  const canReportAccount = Boolean(profile?.id && !isOwnPost && !isAnonymous && post.author_id);
  const authorId = post.author?.id || post.author_id || null;
  const canFollow = Boolean(!isAnonymous && !isOwnPost && authorId);
  const isFollowingAuthor = Boolean(canFollow && authorId && followingIds.has(authorId));

  useEffect(() => {
    if (!showMenu) return;
    const handlePointerDown = (event: PointerEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };
    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [showMenu]);

  const handleAuthorClick = (event: React.MouseEvent) => {
    event.stopPropagation();
    if (isAnonymous || !authorId) return;
    if (authorId === profile?.id) navigate('/profile');
    else navigate(`/student/profile/${authorId}`);
  };

  const copyLink = async (event?: React.MouseEvent) => {
    event?.stopPropagation();
    try {
      await navigator.clipboard.writeText(postLink);
      toast.success('Link copied! 📋');
    } catch {
      toast.error('Could not copy link.');
    }
    setShowMenu(false);
  };

  const handleShare = async (event?: React.MouseEvent) => {
    event?.stopPropagation();
    if (navigator.share) {
      try {
        await navigator.share({
          title: post.title || 'Campus Blink Post',
          text: `${(post.content || '').slice(0, 100)}${(post.content || '').length > 100 ? '...' : ''}`,
          url: postLink,
        });
        return;
      } catch {
      }
    }
    await copyLink();
  };

  return (
    <article onClick={() => navigate(`/community/${post.id}`)} className="cursor-pointer md:rounded-[16px] md:border md:border-black/10 md:bg-[var(--bg)] p-4 transition-all hover:-translate-y-0.5 md:p-5 max-md:bg-white max-md:border-b max-md:border-slate-100 max-md:shadow-[0_2px_8px_rgb(0,0,0,0.01)] max-md:rounded-none max-md:mb-1.5">
      <div className="flex gap-3">
        <button
          type="button"
          onClick={handleAuthorClick}
          disabled={isAnonymous}
          className="mt-1 h-11 w-11 shrink-0 overflow-hidden rounded-full border border-black/10 bg-[var(--bg-secondary)] transition-opacity hover:opacity-80 disabled:cursor-default disabled:hover:opacity-100"
        >
          <ProfilePictureInteract imageUrl={avatar} alt={post.author?.name || 'avatar'} className="h-full w-full">
            {avatar ? <img src={avatar} alt={post.author?.name || 'avatar'} className="h-full w-full object-cover" /> : <div className="flex h-full w-full items-center justify-center font-bold text-[var(--text-primary)]">?</div>}
          </ProfilePictureInteract>
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                <button
                  type="button"
                  onClick={handleAuthorClick}
                  disabled={isAnonymous}
                  className="truncate font-bold text-slate-900 md:text-[var(--text-primary)] transition-colors hover:underline disabled:cursor-default disabled:hover:no-underline max-md:text-[13px]"
                >
                  {isAnonymous ? 'Anonymous Student' : post.author?.name || 'Campus Student'}
                </button>
                <button
                  type="button"
                  onClick={handleAuthorClick}
                  disabled={isAnonymous}
                  className="text-slate-500 md:text-[var(--text-secondary)] transition-colors hover:underline disabled:cursor-default disabled:hover:no-underline max-md:text-[12px]"
                >
                  @{handle}
                </button>
                <span className="text-slate-400 md:text-[var(--text-secondary)]">·</span>
                <span className="text-slate-500 md:text-[var(--text-secondary)] max-md:text-[11px]">{formatRelativeTime(post.created_at)}</span>
                {post.author?.college && !isAnonymous && <span className="rounded-md bg-slate-100 md:bg-[var(--bg-secondary)] px-2 py-0.5 text-[9px] md:text-[10px] font-bold uppercase tracking-[0.15em] text-slate-700 md:text-[var(--text-primary)]">{post.author.college.includes('(MAIT)') ? 'MAIT' : post.author.college}</span>}
                {post.is_pinned && <span className="rounded-md bg-amber-100 md:bg-[var(--yellow)] px-2 py-0.5 text-[9px] md:text-[10px] font-bold uppercase tracking-[0.15em] text-amber-900 md:text-[var(--text-primary)]">Pinned</span>}
              </div>
              {post.title && <h3 className="mt-2 text-lg font-bold leading-tight text-[var(--text-primary)] select-text">{post.title}</h3>}
            </div>

            <div className="flex items-center gap-1">
              {canFollow && (
                <FollowButton
                  targetUserId={authorId}
                  initialFollowing={isFollowingAuthor}
                  size="sm"
                  variant="ghost"
                  className="max-md:h-7 max-md:px-2.5 max-md:text-[11px] max-md:bg-slate-50 max-md:border-none max-md:shadow-none h-6 px-2 text-[11px]"
                  onChange={(nextFollowing) => {
                    if (authorId) onFollowChange(authorId, nextFollowing);
                  }}
                />
              )}

              <div className="relative" ref={menuRef}>
                <button
                  onClick={(event) => {
                    event.stopPropagation();
                    setShowMenu((value) => !value);
                  }}
                  className="flex h-8 w-8 items-center justify-center rounded-md text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg)]/5 hover:text-[var(--text-primary)]"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </button>

                {showMenu && (
                  <div className="absolute right-0 top-10 z-20 min-w-[140px] overflow-hidden rounded-lg border border-black/10 bg-[var(--bg)] shadow-md">
                    <button onClick={copyLink} className="w-full px-4 py-2 text-left text-sm font-bold text-[var(--text-primary)] hover:bg-[var(--bg)]">Copy Link</button>
                    {canReportPost && (
                      <button
                        onClick={(event) => {
                          event.stopPropagation();
                          onReportPost(post);
                          setShowMenu(false);
                        }}
                        className="w-full px-4 py-2 text-left text-sm font-bold text-[var(--yellow-dark)] hover:bg-[#FEF9C3]"
                      >
                        Report Post
                      </button>
                    )}
                    {canReportAccount && (
                      <button
                        onClick={(event) => {
                          event.stopPropagation();
                          onReportAccount(post);
                          setShowMenu(false);
                        }}
                        className="w-full px-4 py-2 text-left text-sm font-bold text-[var(--yellow-dark)] hover:bg-[#FEF9C3]"
                      >
                        Report Account
                      </button>
                    )}
                    {isOwnPost && (
                      <button
                        onClick={(event) => {
                          event.stopPropagation();
                          onDelete(post);
                          setShowMenu(false);
                        }}
                        className="w-full px-4 py-2 text-left text-sm font-bold text-[#DC2626] hover:bg-[#FEE2E2]"
                      >
                        Delete Post
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          <p className="community-post-content mt-2 whitespace-pre-wrap text-[14px] leading-6 text-[var(--text-primary)] select-text">{post.content}</p>
          <PostImageGrid images={images} onOpen={(index) => onOpenImage(images, index)} />

          {/* Action Row — Like, Comment, Share, Bookmark */}
          <div className="mt-4 flex max-w-xl items-center justify-between border-t border-black/5 max-md:border-slate-100/60 pt-2 md:pt-3 text-slate-500 md:text-[var(--text-secondary)]">
            <button
              onClick={(event) => {
                event.stopPropagation();
                onLike(post.id, likedByMe);
              }}
              className={`group flex items-center gap-1.5 md:gap-2 text-[13px] md:text-sm transition-colors ${likedByMe ? 'text-[var(--error)]' : 'hover:text-[var(--error)]'}`}
            >
              <span className={`flex h-10 w-10 md:h-9 md:w-9 items-center justify-center rounded-full transition-colors ${likedByMe ? 'bg-[var(--error)]/10' : 'group-hover:bg-[var(--error)]/10'}`}><Heart className={`h-[18px] w-[18px] md:h-4 md:w-4 ${likedByMe ? 'fill-current text-[var(--error)]' : ''}`} strokeWidth={1.5} /></span>
              <span className="font-medium">{post.likes_count || 0}</span>
            </button>

            <button
              onClick={(event) => {
                event.stopPropagation();
                setShowCommentModal(true);
              }}
              className="group flex items-center gap-1.5 md:gap-2 text-[13px] md:text-sm transition-colors hover:text-slate-900 md:hover:text-[var(--text-primary)]"
            >
              <span className="flex h-10 w-10 md:h-9 md:w-9 items-center justify-center rounded-full transition-colors group-hover:bg-slate-100 md:group-hover:bg-[var(--bg-secondary)]"><MessageCircle className="h-[18px] w-[18px] md:h-4 md:w-4" strokeWidth={1.5} /></span>
              <span className="font-medium">{post.comments_count || 0}</span>
            </button>

            <button
              onClick={handleShare}
              className="group flex items-center gap-1 p-0 transition-colors hover:text-slate-900 md:hover:text-[var(--text-primary)]"
            >
              <span className="flex h-10 w-10 md:h-9 md:w-9 items-center justify-center rounded-full transition-colors group-hover:bg-slate-100 md:group-hover:bg-[var(--bg-secondary)]">
                <Share2 className="h-[18px] w-[18px] md:h-4 md:w-4" strokeWidth={1.5} />
              </span>
            </button>

            {/* Dedicated Bookmark Button */}
            <button
              onClick={handleBookmarkToggle}
              className={`group flex items-center gap-1.5 md:gap-2 text-[13px] md:text-sm transition-colors ${isBookmarked ? 'text-[var(--accent-blue,#3b82f6)]' : 'hover:text-[var(--accent-blue,#3b82f6)]'}`}
            >
              <span className={`flex h-10 w-10 md:h-9 md:w-9 items-center justify-center rounded-full transition-colors ${isBookmarked ? 'bg-[var(--accent-blue,#3b82f6)]/10' : 'group-hover:bg-[var(--accent-blue,#3b82f6)]/10'}`}>
                <Bookmark className="h-[18px] w-[18px] md:h-4 md:w-4" strokeWidth={1.5} fill={isBookmarked ? 'currentColor' : 'none'} />
              </span>
              <span className="font-medium">{localBookmarkCount || 0}</span>
            </button>
          </div>

          {/* Reply Modal */}
          <Transition appear show={showCommentModal} as={Fragment}>
            <Dialog as="div" className="relative z-50" onClose={() => setShowCommentModal(false)}>
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0"
                enterTo="opacity-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100"
                leaveTo="opacity-0"
              >
                <div className="fixed inset-0 bg-black/40" />
              </Transition.Child>

              <div className="fixed inset-0 overflow-y-auto">
                <div className="flex min-h-full items-start justify-center p-4 text-center sm:p-0 sm:pt-14 mt-10">
                  <Transition.Child
                    as={Fragment}
                    enter="ease-out duration-300"
                    enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                    enterTo="opacity-100 translate-y-0 sm:scale-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100 translate-y-0 sm:scale-100"
                    leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                  >
                    <Dialog.Panel onClick={(e) => e.stopPropagation()} className="relative w-full max-w-xl transform overflow-hidden rounded-2xl bg-[var(--bg)] p-4 text-left align-middle shadow-xl transition-all">
                      <div className="flex justify-between items-center pb-3">
                        <button onClick={() => setShowCommentModal(false)} className="rounded-full p-2 hover:bg-black/10 transition">
                          <X className="h-5 w-5 text-[var(--text-primary)]" />
                        </button>
                        <div className="text-[var(--text-primary)] font-bold text-sm px-4">Drafts</div>
                      </div>
                      <div className="flex gap-3 px-2">
                        <div className="flex flex-col items-center">
                          <img src={avatar || '/placeholder-avatar.png'} alt="user" className="h-10 w-10 rounded-full bg-black/10 object-cover" />
                          <div className="w-[2px] h-full bg-black/10 my-2" />
                        </div>
                        <div className="flex-1 pb-6 relative">
                          <div className="flex items-center gap-1 font-bold text-[var(--text-primary)]">{post.author?.name || 'Anonymous'} <span className="text-[var(--text-secondary)] font-normal">@{handle}</span> <span className="text-[var(--text-secondary)] font-normal">· {formatRelativeTime(post.created_at)}</span></div>
                          <p className="text-[var(--text-primary)] mt-1 pr-4 select-text">{post.content}</p>
                          <p className="text-[var(--text-secondary)] text-sm mt-4">Replying to <span className="text-[var(--text-primary)]">@{handle}</span></p>
                        </div>
                      </div>
                      <div className="flex gap-3 mt-2 px-2">
                        <img src={profile?.avatar_url || getAvatarDataUrl({name: profile?.name || 'user', seed: profile?.id || 'd'}) || '/placeholder-avatar.png'} alt="user" className="h-10 w-10 rounded-full bg-black/10 object-cover flex-shrink-0" />
                        <div className="flex-1">
                          <textarea
                            value={replyText}
                            onChange={(e) => setReplyText(e.target.value)}
                            placeholder="Post your reply"
                            className="w-full resize-none border-none bg-transparent p-0 text-xl placeholder-[var(--text-muted)] focus:ring-0 text-[var(--text-primary)] mt-2 outline-none"
                            rows={4}
                          />
                        </div>
                      </div>
                      <div className="flex justify-between items-center mt-4 border-t border-black/10 pt-3 px-2">
                        <div className="flex text-[var(--text-primary)]">
                          <ImageIcon className="h-5 w-5 mx-2 cursor-pointer" />
                          <Link2 className="h-5 w-5 mx-2 cursor-pointer" />
                        </div>
                        <button
                          disabled={!replyText.trim() || isSubmittingReply}
                          onClick={async () => {
                            setIsSubmittingReply(true);
                            try {
                              await addComment(post.id, profile?.id, replyText);
                              toast.success('Reply sent!');
                              setShowCommentModal(false);
                              setReplyText('');
                              onCommentAdded?.(post.id);
                            } catch(e) {
                              toast.error('Failed to reply.');
                            } finally {
                              setIsSubmittingReply(false);
                            }
                          }}
                          className="bg-[var(--yellow)] text-[var(--text-primary)] rounded-full px-4 py-1.5 font-bold disabled:opacity-50 hover:bg-[var(--yellow)] hover:text-[var(--text-primary)]"
                        >
                          {isSubmittingReply ? 'Replying...' : 'Reply'}
                        </button>
                      </div>
                    </Dialog.Panel>
                  </Transition.Child>
                </div>
              </div>
            </Dialog>
          </Transition>

          {isAdmin && isAnonymous && (
            <div className="mt-2 flex justify-end">
              <span
                onClick={(e) => e.stopPropagation()}
                className="rounded bg-[var(--bg)]/6 px-2 py-0.5 font-mono text-[10px] text-[var(--text-secondary)] select-all"
                title="Post ID (admin only)"
              >
                ID: {post.id.substring(0, 8)}
              </span>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
