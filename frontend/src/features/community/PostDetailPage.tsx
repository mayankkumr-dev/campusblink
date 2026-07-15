import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { AnimatePresence } from 'motion/react';
import { ArrowLeft, Bookmark, ChevronLeft, ChevronRight, Heart, Loader2, MessageCircle, Repeat2, Send, Share2, Trash2, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../store/authStore';
import { addComment, deleteComment, getComments, getPostDetail, toggleCommentLike, togglePostLike, togglePostBookmark } from '../../api/community';
import { getAvatarDataUrl } from '../../lib/avatar';
import { getDisplayHandle } from '../../lib/user';
import { ProfilePictureInteract } from '../../app/components/ProfilePictureInteract';

function buildCommentTree(flatComments: any[]): any[] {
  const map = new Map<string, any>();
  const roots: any[] = [];
  flatComments.forEach((c) => map.set(c.id, { ...c, children: [] }));
  flatComments.forEach((c) => {
    if (c.parent_comment_id && map.has(c.parent_comment_id)) {
      map.get(c.parent_comment_id)!.children.push(map.get(c.id)!);
    } else {
      roots.push(map.get(c.id)!);
    }
  });
  return roots;
}

interface CommentItemProps {
  key?: React.Key;
  comment: any;
  post: any;
  profile: any;
  depth?: number;
  onDelete: (commentId: string, parentId: string | null) => void;
  onReplySubmit: (parentCommentId: string, content: string) => Promise<void>;
  onLikeComment: (commentId: string, likedByMe: boolean) => void;
  navigateToUser: (authorId: string) => void;
}

function CommentItem({ comment, post, profile, depth = 0, onDelete, onReplySubmit, onLikeComment, navigateToUser }: CommentItemProps) {
  const [showReplyInput, setShowReplyInput] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);
  const [repliesExpanded, setRepliesExpanded] = useState((comment.children?.length || 0) <= 3);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const commentAvatar = comment.author?.avatar_url || getAvatarDataUrl({ name: comment.author?.name, seed: comment.author?.id || comment.author_id || comment.id });
  const likedByMe = Boolean(profile?.id && comment.liked_by?.includes(profile.id));
  const canDelete = profile?.id && (profile.id === comment.author_id || profile.id === post?.author_id || profile.role === 'admin');

  const handleReplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim()) return;
    setIsSubmittingReply(true);
    await onReplySubmit(comment.id, replyText.trim());
    setReplyText(''); setShowReplyInput(false); setRepliesExpanded(true);
    setIsSubmittingReply(false);
  };

  const childCount = comment.children?.length || 0;
  const indentClass = depth > 0 ? 'ml-5 pl-3 border-l-2 border-black/[0.08]' : '';

  return (
    <div className={indentClass}>
      <div className="flex gap-3 py-3">
        <button type="button" onClick={() => navigateToUser(comment.author?.id || comment.author_id)} className="mt-0.5 h-8 w-8 shrink-0 overflow-hidden rounded-full border border-black/10 bg-[var(--bg)] transition-opacity hover:opacity-75">
          <ProfilePictureInteract imageUrl={commentAvatar} alt={comment.author?.name || 'avatar'} className="h-full w-full">
            <img loading="lazy" src={commentAvatar} alt={comment.author?.name || 'avatar'} className="h-full w-full rounded-full object-cover" />
          </ProfilePictureInteract>
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--text-secondary)]">
            <button type="button" onClick={() => navigateToUser(comment.author?.id || comment.author_id)} className="font-bold text-[var(--text-primary)] transition-colors hover:underline">
              {comment.author?.name || 'Student'}
            </button>
            {comment.author?.college && (
              <span className="rounded-md bg-[var(--yellow)]/15 px-2 py-0.5 font-bold uppercase tracking-[0.14em] text-[var(--text-primary)]">
                {String(comment.author.college).includes('(MAIT)') ? 'MAIT' : comment.author.college}
              </span>
            )}
            <span>·</span><span>{formatRelativeTime(comment.created_at)}</span>
          </div>
          <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-[var(--text-primary)] select-text">{comment.content}</p>
          <div className="mt-1.5 flex items-center gap-4">
            <button onClick={() => onLikeComment(comment.id, likedByMe)} disabled={!profile?.id} className={`flex items-center gap-1 text-xs font-bold transition-colors disabled:opacity-50 ${likedByMe ? 'text-[var(--error)]' : 'text-[var(--text-secondary)] hover:text-[var(--error)]'}`}>
              <Heart className={`h-3.5 w-3.5 ${likedByMe ? 'fill-current' : ''}`} /><span>{comment.likes_count || 0}</span>
            </button>
            {profile?.id && (
              <button onClick={() => setShowReplyInput((v) => !v)} className="flex items-center gap-1 text-xs font-bold text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]">
                <MessageCircle className="h-3.5 w-3.5" /> Reply
              </button>
            )}
            {canDelete && (
              <button onClick={() => setShowDeleteConfirm(true)} className="flex items-center gap-1 text-xs font-bold text-[var(--text-secondary)] transition-colors hover:text-[#DC2626]">
                <Trash2 className="h-3.5 w-3.5" /> Delete
              </button>
            )}
          </div>
          {showReplyInput && profile && (
            <form onSubmit={handleReplySubmit} className="mt-2">
              <textarea value={replyText} onChange={(e) => setReplyText(e.target.value)} placeholder={`@${comment.author?.name || 'user'} `} rows={2} autoFocus className="w-full resize-none rounded-[14px] border border-black/10 bg-[var(--bg-primary)] px-3 py-2 text-sm outline-none focus:border-[var(--yellow)]" />
              <div className="mt-1.5 flex justify-end gap-2">
                <button type="button" onClick={() => { setShowReplyInput(false); setReplyText(''); }} className="rounded-md px-3 py-1.5 text-xs font-bold text-[var(--text-secondary)] hover:bg-black/5">Cancel</button>
                <button type="submit" disabled={isSubmittingReply || !replyText.trim()} className="inline-flex items-center gap-1.5 rounded-md bg-[var(--yellow)] px-4 py-1.5 text-xs font-bold text-[var(--text-primary)] disabled:opacity-60">
                  {isSubmittingReply ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />} Reply
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
      {showDeleteConfirm && (
        <div className="mb-2 ml-11 rounded-[14px] border border-[#DC2626]/20 bg-accent-red/15 p-3">
          <p className="text-sm font-bold text-[var(--text-primary)]">Delete this comment? This cannot be undone.</p>
          <div className="mt-2 flex gap-2">
            <button onClick={() => { setShowDeleteConfirm(false); onDelete(comment.id, comment.parent_comment_id || null); }} className="rounded-md bg-[#DC2626] px-3 py-1.5 text-xs font-bold text-white hover:bg-[var(--error-dark)]">Delete</button>
            <button onClick={() => setShowDeleteConfirm(false)} className="rounded-md border border-black/10 px-3 py-1.5 text-xs font-bold text-[var(--text-primary)] hover:bg-black/5">Cancel</button>
          </div>
        </div>
      )}
      {childCount > 0 && (
        <div className="ml-11">
          <button onClick={() => setRepliesExpanded((v) => !v)} className="mb-1 text-xs font-bold text-[var(--yellow-dark)] hover:underline">
            {repliesExpanded ? `Hide ${childCount} ${childCount === 1 ? 'reply' : 'replies'}` : `View ${childCount} ${childCount === 1 ? 'reply' : 'replies'} ▾`}
          </button>
          {repliesExpanded && comment.children.map((child: any) => (
            <CommentItem key={child.id} comment={child} post={post} profile={profile} depth={depth + 1} onDelete={onDelete} onReplySubmit={onReplySubmit} onLikeComment={onLikeComment} navigateToUser={navigateToUser} />
          ))}
        </div>
      )}
    </div>
  );
}

const POST_IMAGE_DELIMITER = '|||';

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

function parseImageUrls(post: any): string[] {
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

function setMeta(property: string, content: string, useName = false) {
  const selector = useName ? `meta[name="${property}"]` : `meta[property="${property}"]`;
  let node = document.head.querySelector(selector) as HTMLMetaElement | null;

  if (!node) {
    node = document.createElement('meta');
    if (useName) node.setAttribute('name', property);
    else node.setAttribute('property', property);
    document.head.appendChild(node);
  }

  node.setAttribute('content', content);
}

function PostImageGrid({ images, onOpen }: { images: string[]; onOpen: (index: number) => void }) {
  if (!images.length) return null;

  if (images.length === 1) {
    return (
      <div className="mt-4 overflow-hidden rounded-[24px] border border-black/10 bg-[var(--bg-secondary)]">
        <button type="button" onClick={() => onOpen(0)} className="w-full">
          <img loading="lazy" src={images[0]} alt="Post attachment" className="max-h-[620px] w-full object-contain" />
        </button>
      </div>
    );
  }

  return (
    <div className="mt-4 grid grid-cols-2 gap-1 overflow-hidden rounded-[24px] border border-black/10 bg-[var(--bg-secondary)]">
      {images.slice(0, 4).map((image, index) => (
        <button key={`${image}-${index}`} type="button" onClick={() => onOpen(index)} className="relative aspect-[4/3] overflow-hidden bg-[var(--bg-tertiary)]">
          <img loading="lazy" src={image} alt={`Post attachment ${index + 1}`} className="h-full w-full object-contain" />
          {images.length > 4 && index === 3 && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/45 text-2xl font-extrabold text-white">+{images.length - 4}</div>
          )}
        </button>
      ))}
    </div>
  );
}

const ImageLightbox = ({
  images,
  index,
  onClose,
  onNavigate,
}: {
  images: string[];
  index: number;
  onClose: () => void;
  onNavigate: (index: number) => void;
}) => {
  const safeIndex = Math.max(0, Math.min(index, images.length - 1));

  const goPrev = () => onNavigate((safeIndex - 1 + images.length) % images.length);
  const goNext = () => onNavigate((safeIndex + 1) % images.length);

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/80 p-4" onClick={onClose}>
      <button onClick={onClose} className="absolute right-4 top-4 z-10 rounded-md bg-[var(--bg)]/10 p-2 text-white hover:bg-[var(--bg)]/20"><X className="h-6 w-6" /></button>
      {images.length > 1 && (
        <>
          <button onClick={(event) => { event.stopPropagation(); goPrev(); }} className="absolute left-4 top-1/2 z-10 -translate-y-1/2 rounded-md bg-[var(--bg)]/10 p-2 text-white hover:bg-[var(--bg)]/20"><ChevronLeft className="h-6 w-6" /></button>
          <button onClick={(event) => { event.stopPropagation(); goNext(); }} className="absolute right-4 top-1/2 z-10 -translate-y-1/2 rounded-md bg-[var(--bg)]/10 p-2 text-white hover:bg-[var(--bg)]/20"><ChevronRight className="h-6 w-6" /></button>
        </>
      )}
      <img loading="lazy" onClick={(event) => event.stopPropagation()} src={images[safeIndex]} alt="Expanded attachment" className="max-h-[92vh] max-w-[92vw] rounded-lg object-contain" />
    </div>
  );
};

export const PostDetailPage: React.FC = () => {
  const { postId } = useParams();
  const navigate = useNavigate();
  const profile = useAuthStore((state) => state.profile);
  const [post, setPost] = useState<any>(null);
  const [flatComments, setFlatComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [lightbox, setLightbox] = useState<{ images: string[]; index: number } | null>(null);
  const [showMenu, setShowMenu] = useState(false);
  const replyRef = useRef<HTMLTextAreaElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const postLink = useMemo(() => `${window.location.origin}/community/${postId || ''}`, [postId]);
  const commentTree = useMemo(() => buildCommentTree(flatComments), [flatComments]);

  useEffect(() => {
    const load = async () => {
      if (!postId) {
        setNotFound(true);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      const [{ data: postData, error: postError }, { data: commentData }] = await Promise.all([
        getPostDetail(postId, profile?.id || null),
        getComments(postId),
      ]);

      if (postError || !postData) {
        setNotFound(true);
        setPost(null);
      } else {
        setNotFound(false);
        setPost(postData);
        setFlatComments(commentData || []);
      }

      setIsLoading(false);
    };

    load();
  }, [postId, profile?.id]);

  useEffect(() => {
    if (isLoading) return;

    if (!post) {
      document.title = 'Post not found — Campus Blink';
      setMeta('description', 'This post does not exist or was deleted.', true);
      setMeta('og:title', 'Post not found — Campus Blink');
      setMeta('og:description', 'This post does not exist or was deleted.');
      setMeta('og:url', postLink);
      return;
    }

    const title = post.title ? `${post.title} — Campus Blink` : `${post.author_name || post.author?.name || 'Student'} on Campus Blink`;
    const description = (post.content || '').slice(0, 180) || 'View this post on Campus Blink.';

    document.title = title;
    setMeta('description', description, true);
    setMeta('og:title', title);
    setMeta('og:description', description);
    setMeta('og:url', postLink);
  }, [isLoading, post, postLink]);

  useEffect(() => {
    if (!showMenu) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
    };
  }, [showMenu]);

  const images = parseImageUrls(post);
  const likedByMe = Boolean(profile?.id && post?.liked_by?.includes(profile.id));
  const [isBookmarked, setIsBookmarked] = useState(post?.user_has_bookmarked || false);
  const [localBookmarkCount, setLocalBookmarkCount] = useState(post?.bookmarks_count || 0);

  // Sync bookmark state when post data is fetched/updated
  useEffect(() => {
    if (post) {
      setIsBookmarked(post.user_has_bookmarked || false);
      setLocalBookmarkCount(post.bookmarks_count || 0);
    }
  }, [post?.user_has_bookmarked, post?.bookmarks_count]);
  const avatar = post?.is_anonymous
    ? null
    : post?.author?.avatar_url || getAvatarDataUrl({ name: post?.author?.name, seed: post?.author?.id || post?.author_id || post?.id });

  const navigateToUser = useCallback((authorId: string) => {
    if (!authorId) return;
    if (authorId === profile?.id) navigate('/profile');
    else navigate(`/student/profile/${authorId}`);
  }, [navigate, profile?.id]);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(postLink);
      toast.success('Link copied! 📋');
    } catch {
      toast.error('Could not copy link.');
    }
    setShowMenu(false);
  };

  const handleShare = async () => {
    if (!post) return;

    const shareText = `${(post.content || '').slice(0, 100)}${(post.content || '').length > 100 ? '...' : ''}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: post.title || 'Campus Blink Post',
          text: shareText,
          url: postLink,
        });
        return;
      } catch {
      }
    }

    try {
      await navigator.clipboard.writeText(postLink);
      toast.success('Link copied! 📋');
    } catch {
      toast.error('Could not copy link.');
    }
  };

  const handleLike = async () => {
    if (!post || !profile?.id) return;

    const likedBy = new Set(post.liked_by || []);
    if (likedByMe) likedBy.delete(profile.id);
    else likedBy.add(profile.id);

    const optimistic = {
      ...post,
      liked_by: Array.from(likedBy),
      likes_count: Math.max(0, (post.likes_count || 0) + (likedByMe ? -1 : 1)),
    };

    setPost(optimistic);

    const { error } = await togglePostLike(post.id, profile.id);
    if (error) {
      toast.error(error.message || 'Could not update like.');
      setPost(post);
    }
  };

  const handleBookmarkToggle = async () => {
    if (!post || !profile?.id) { toast.error('Log in to bookmark'); return; }
    const prev = isBookmarked;
    const prevCount = localBookmarkCount;
    setIsBookmarked(!prev);
    setLocalBookmarkCount(prev ? Math.max(0, prevCount - 1) : prevCount + 1);

    const { error } = await togglePostBookmark(post.id, profile.id);
    if (error) {
      setIsBookmarked(prev);
      setLocalBookmarkCount(prevCount);
      toast.error('Failed to bookmark');
    } else {
      toast.success(prev ? 'Removed from Bookmarks' : 'Added to Bookmarks');
      setPost((prevPost: any) => prevPost ? {
        ...prevPost,
        user_has_bookmarked: !prev,
        bookmarks_count: prev ? Math.max(0, (prevPost.bookmarks_count || 0) - 1) : (prevPost.bookmarks_count || 0) + 1
      } : prevPost);
    }
  };

  const handleCommentLike = async (commentId: string, commentLikedByMe: boolean) => {
    if (!profile?.id) { toast.error('Please log in to like.'); return; }
    setFlatComments((prev) => prev.map((c) => {
      if (c.id !== commentId) return c;
      const likedBy = new Set(c.liked_by || []);
      if (commentLikedByMe) likedBy.delete(profile.id); else likedBy.add(profile.id);
      return { ...c, liked_by: Array.from(likedBy), likes_count: Math.max(0, (c.likes_count || 0) + (commentLikedByMe ? -1 : 1)) };
    }));
    const { error } = await toggleCommentLike(commentId, profile.id);
    if (error) {
      setFlatComments((prev) => prev.map((c) => {
        if (c.id !== commentId) return c;
        const likedBy = new Set(c.liked_by || []);
        if (commentLikedByMe) likedBy.add(profile.id); else likedBy.delete(profile.id);
        return { ...c, liked_by: Array.from(likedBy), likes_count: Math.max(0, (c.likes_count || 0) + (commentLikedByMe ? 1 : -1)) };
      }));
      toast.error('Could not update like.');
    }
  };

  const handleTopLevelReply = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!profile?.id || !post?.id || !newComment.trim()) return;

    setIsSubmitting(true);
    const { data, error } = await addComment(post.id, profile.id, newComment.trim(), null);
    if (error) { toast.error('Failed to post reply.'); }
    else if (data) {
      setFlatComments((prev) => [...prev, data]);
      setPost((prev: any) => prev ? { ...prev, comments_count: (prev.comments_count || 0) + 1 } : prev);
      setNewComment('');
    }
    setIsSubmitting(false);
  };

  const handleReplySubmit = async (parentCommentId: string, content: string) => {
    if (!profile?.id || !post?.id) return;
    const { data, error } = await addComment(post.id, profile.id, content, parentCommentId);
    if (error) { toast.error('Failed to post reply.'); return; }
    if (data) {
      setFlatComments((prev) => [...prev, data]);
      setPost((prev: any) => prev ? { ...prev, comments_count: (prev.comments_count || 0) + 1 } : prev);
    }
  };

  const handleDeleteComment = async (commentId: string, parentId: string | null) => {
    const getDescendants = (id: string): string[] => {
      const children = flatComments.filter((c) => c.parent_comment_id === id);
      return [id, ...children.flatMap((c) => getDescendants(c.id))];
    };
    const toDelete = new Set(getDescendants(commentId));
    const { error } = await deleteComment(commentId, post?.id, parentId);
    if (error) { toast.error('Failed to delete comment.'); return; }
    setFlatComments((prev) => prev.filter((c) => !toDelete.has(c.id)));
    setPost((prev: any) => prev ? { ...prev, comments_count: Math.max(0, (prev.comments_count || 0) - toDelete.size) } : prev);
    if (parentId) {
      setFlatComments((prev) => prev.map((c) => c.id === parentId ? { ...c, replies_count: Math.max(0, (c.replies_count || 0) - 1) } : c));
    }
    toast.success('Comment deleted');
  };

  if (isLoading) {
    return <div className="flex min-h-screen items-center justify-center bg-[var(--bg-primary)]"><Loader2 className="h-8 w-8 animate-spin text-[var(--text-primary)]" /></div>;
  }

  if (notFound || !post) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] px-4 py-10">
        <div className="mx-auto max-w-3xl rounded-[32px] border border-black/10 bg-[var(--bg)] p-10 text-center shadow-[0_24px_70px_rgba(15,23,42,0.06)]">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-md bg-[var(--yellow)]/20 text-4xl">(=^.^=)</div>
          <h1 className="font-syne text-3xl font-extrabold text-[var(--text-primary)]">This post does not exist or was deleted.</h1>
          <p className="mt-3 text-sm text-[var(--text-secondary)]">It may have been removed, or the link is invalid.</p>
          <button onClick={() => navigate('/student/community')} className="mt-6 rounded-md bg-[var(--text-primary)] px-6 py-3 text-sm font-bold text-white hover:bg-[var(--yellow)] hover:text-[var(--text-primary)]">Go to Community</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] pb-28">
      <div className="mx-auto max-w-3xl px-3 py-4 md:px-6">
        <div className="overflow-hidden rounded-[32px] border border-black/10 bg-[var(--bg)] shadow-[0_24px_70px_rgba(15,23,42,0.06)]">
          <header className="sticky top-0 z-20 flex items-center gap-4 border-b border-black/10 bg-[var(--bg)]/95 px-5 py-4 ">
            <button onClick={() => navigate(-1)} className="rounded-md p-2 text-[var(--text-secondary)] transition-colors hover:bg-black/5 hover:text-[var(--text-primary)]"><ArrowLeft className="h-5 w-5" /></button>
            <h1 className="font-syne text-2xl font-extrabold text-[var(--text-primary)]">Post</h1>
          </header>

          <article className="border-b border-black/10 px-5 py-5">
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => !post.is_anonymous && post.author?.id && navigateToUser(post.author.id)}
                disabled={post.is_anonymous || !post.author?.id}
                className="mt-1 h-12 w-12 shrink-0 overflow-hidden rounded-full border border-black/10 bg-[var(--bg-secondary)] transition-opacity hover:opacity-80 disabled:cursor-default disabled:hover:opacity-100"
              >
                <ProfilePictureInteract imageUrl={avatar} alt={post.author?.name || 'avatar'} className="h-full w-full">
                  {avatar ? <img loading="lazy" src={avatar} alt={post.author?.name || 'avatar'} className="h-full w-full rounded-full object-cover" /> : <div className="flex h-full w-full items-center justify-center font-bold text-[var(--text-primary)]">?</div>}
                </ProfilePictureInteract>
              </button>

              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                      <button
                        type="button"
                        onClick={() => !post.is_anonymous && post.author?.id && navigateToUser(post.author.id)}
                        disabled={post.is_anonymous || !post.author?.id}
                        className="truncate font-bold text-[var(--text-primary)] transition-colors hover:underline disabled:cursor-default disabled:hover:no-underline"
                      >
                        {post.is_anonymous ? 'Anonymous Student' : post.author?.name || 'Campus Student'}
                      </button>
                      <span className="text-[var(--text-secondary)]">@{post.is_anonymous ? 'anonymous' : getDisplayHandle(post.author?.username, 'student')}</span>
                      <span className="text-[var(--text-muted)]">·</span>
                      <span className="text-[var(--text-secondary)]">{formatRelativeTime(post.created_at)}</span>
                      {post.college && !post.is_anonymous && <span className="rounded-md bg-[var(--yellow)]/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.15em] text-[var(--text-primary)]">{String(post.college).includes('(MAIT)') ? 'MAIT' : post.college}</span>}
                    </div>
                    {post.title && <h2 className="mt-2 text-xl font-bold leading-tight text-[var(--text-primary)]">{post.title}</h2>}
                  </div>

                  <div className="relative" ref={menuRef}>
                    <button onClick={() => setShowMenu((value) => !value)} className="flex h-9 w-9 items-center justify-center rounded-md text-[var(--text-secondary)] transition-colors hover:bg-black/5 hover:text-[var(--text-primary)]">•••</button>
                    {showMenu && (
                      <div className="absolute right-0 top-10 z-20 min-w-[140px] overflow-hidden rounded-lg border border-black/10 bg-[var(--bg)] shadow-md">
                        <button onClick={copyLink} className="w-full px-4 py-2 text-left text-sm font-bold text-[var(--text-primary)] hover:bg-[var(--bg-primary)]">Copy Link</button>
                      </div>
                    )}
                  </div>
                </div>

                <p className="mt-3 whitespace-pre-wrap text-[15px] leading-7 text-[var(--text-primary)] select-text">{post.content}</p>
                <PostImageGrid images={images} onOpen={(index) => setLightbox({ images, index })} />

                <div className="mt-4 border-y border-black/10 py-3 text-sm text-[var(--text-secondary)]">
                  <span className="font-bold text-[var(--text-primary)]">{post.comments_count ?? flatComments.length}</span> Comments · <span className="font-bold text-[var(--text-primary)]">{post.likes_count || 0}</span> Likes · <span className="font-bold text-[var(--text-primary)]">{localBookmarkCount}</span> Bookmarks
                </div>

                <div className="mt-1 flex max-w-xl items-center justify-between text-[var(--text-secondary)]">
                  <button onClick={() => replyRef.current?.focus()} className="group flex items-center gap-2 text-sm transition-colors hover:text-[var(--text-primary)]"><span className="flex h-9 w-9 items-center justify-center rounded-md transition-colors group-hover:bg-[var(--yellow)]/15"><MessageCircle className="h-4 w-4" /></span><span>{post.comments_count ?? flatComments.length}</span></button>
                  <button onClick={() => toast('Repost is coming soon.', { icon: '🔁' })} className="group flex items-center gap-2 text-sm transition-colors hover:text-[var(--text-primary)]"><span className="flex h-9 w-9 items-center justify-center rounded-md transition-colors group-hover:bg-black/10"><Repeat2 className="h-4 w-4" /></span></button>
                  <button onClick={handleLike} disabled={!profile?.id} className={`group flex items-center gap-2 text-sm transition-colors ${likedByMe ? 'text-[var(--error)]' : 'hover:text-[var(--error)]'} ${!profile?.id ? 'opacity-60 cursor-not-allowed' : ''}`}><span className={`flex h-9 w-9 items-center justify-center rounded-md transition-colors ${likedByMe ? 'bg-[var(--error)]/10' : 'group-hover:bg-[var(--error)]/10'}`}><Heart className={`h-4 w-4 ${likedByMe ? 'fill-current' : ''}`} /></span><span>{post.likes_count || 0}</span></button>
                  <button onClick={handleShare} className="group flex items-center gap-2 text-sm transition-colors hover:text-[var(--text-primary)]"><span className="flex h-9 w-9 items-center justify-center rounded-md transition-colors group-hover:bg-[var(--yellow)]/15"><Share2 className="h-4 w-4" /></span></button>
                  <button onClick={handleBookmarkToggle} disabled={!profile?.id} className={`group flex items-center gap-2 text-sm transition-colors ${isBookmarked ? 'text-[var(--accent-blue,#3b82f6)]' : 'hover:text-[var(--accent-blue,#3b82f6)]'} ${!profile?.id ? 'opacity-60 cursor-not-allowed' : ''}`}><span className={`flex h-9 w-9 items-center justify-center rounded-md transition-colors ${isBookmarked ? 'bg-[var(--accent-blue,#3b82f6)]/10' : 'group-hover:bg-[var(--accent-blue,#3b82f6)]/10'}`}><Bookmark className="h-4 w-4" fill={isBookmarked ? 'currentColor' : 'none'} /></span><span>{localBookmarkCount}</span></button>
                </div>
              </div>
            </div>
          </article>

          <section className="px-5 py-5">
            <h3 className="mb-4 font-syne text-2xl font-extrabold text-[var(--text-primary)]">Replies</h3>

            {/* Top-level reply input */}
            {profile ? (
              <form onSubmit={handleTopLevelReply} className="mb-5 rounded-[24px] border border-black/10 bg-[var(--bg)] p-4">
                <textarea
                  ref={replyRef}
                  value={newComment}
                  onChange={(event) => setNewComment(event.target.value)}
                  placeholder="Write your reply..."
                  rows={4}
                  className="w-full resize-none rounded-[18px] border border-black/10 bg-[var(--bg-primary)] px-4 py-3 text-sm outline-none focus:border-[var(--yellow)]"
                />
                <div className="mt-3 flex justify-end">
                  <button type="submit" disabled={isSubmitting || !newComment.trim()} className="inline-flex items-center gap-2 rounded-md bg-[var(--text-primary)] px-5 py-2.5 text-sm font-bold text-white hover:bg-[var(--yellow)] hover:text-[var(--text-primary)] disabled:opacity-60">
                    {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Reply
                  </button>
                </div>
              </form>
            ) : null}

            {/* Nested comment tree */}
            <div className="divide-y divide-black/[0.06]">
              {commentTree.length > 0 ? (
                commentTree.map((comment) => (
                  <CommentItem
                    key={comment.id}
                    comment={comment}
                    post={post}
                    profile={profile}
                    depth={0}
                    onDelete={handleDeleteComment}
                    onReplySubmit={handleReplySubmit}
                    onLikeComment={handleCommentLike}
                    navigateToUser={navigateToUser}
                  />
                ))
              ) : (
                <div className="rounded-[22px] border border-dashed border-black/10 bg-[var(--bg-primary)] p-8 text-center text-sm text-[var(--text-secondary)]">No replies yet. Be the first!</div>
              )}
            </div>
          </section>
        </div>
      </div>

      {!profile && (
        <div className="fixed bottom-4 left-1/2 z-30 w-[calc(100%-1rem)] max-w-3xl -translate-x-1/2 rounded-lg border border-[var(--yellow)]/35 bg-[var(--yellow)]/95 p-3 shadow-md">
          <Link to={`/login?redirect=${encodeURIComponent(`/community/${post.id}`)}`} className="flex items-center justify-between gap-3 px-2">
            <span className="text-sm font-bold text-[var(--text-primary)]">Login to like and reply</span>
            <span className="rounded-md bg-[var(--text-primary)] px-4 py-1.5 text-xs font-bold uppercase tracking-[0.15em] text-white">Login</span>
          </Link>
        </div>
      )}

      <AnimatePresence>
        {lightbox && (
          <ImageLightbox images={lightbox.images} index={lightbox.index} onClose={() => setLightbox(null)} onNavigate={(next) => setLightbox((current) => current ? { ...current, index: next } : current)} />
        )}
      </AnimatePresence>
    </div>
  );
};
