import React, { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useSearchParams, useNavigate } from 'react-router';
import { Heart, Trash2, X, BookOpen, Clock, ThumbsUp, MessageCircle, Send, Share2, Gift, MoreHorizontal, ChevronDown, Bookmark } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../store/authStore';
import { getDiaryFeed, toggleDiaryLike, deleteDiaryEntry, getRecentFriendWriters, toggleDiaryBookmark } from '../../api/diary';
import { getFollowingIds } from '../../api/follow';
import { getAvatarDataUrl } from '../../lib/avatar';
import { supabase } from '../../lib/supabase';

/* ─── Types ──────────────────────────────────────────────────────── */
export interface DiaryEntry {
  id: string;
  content: string;
  font_family: string;
  text_color: string;
  bg_color: string;
  gradient?: string | null;
  image_url?: string | null;
  thumbnail_url?: string | null;
  scale: number;
  likes_count: number;
  comments_count?: number;
  liked_by: string[];
  user_has_bookmarked?: boolean;
  created_at: string;
  author?: {
    id: string;
    name: string;
    username: string;
    avatar_url?: string;
    college?: string;
  };
}

export interface DiaryMasonryGridProps {
  filter?: 'new' | 'popular' | 'friends' | 'mine';
  followingIds?: string[];
  newEntry?: DiaryEntry | null;
  onFilterChange?: (filter: 'new' | 'popular' | 'friends' | 'mine') => void;
  onOpenCreate?: () => void;
}

interface CommentItem {
  id: string;
  authorName: string;
  authorAvatar: string;
  text: string;
  time: string;
}

/* ─── Helpers ────────────────────────────────────────────────────── */
function relativeTime(value: string) {
  const diff = Date.now() - new Date(value).getTime();
  const min = 60 * 1000, hour = 60 * min, day = 24 * hour;
  if (diff < min)   return 'Just now';
  if (diff < hour)  return `${Math.max(1, Math.floor(diff / min))}m`;
  if (diff < day)   return `${Math.max(1, Math.floor(diff / hour))}h`;
  if (diff < 7*day) return `${Math.max(1, Math.floor(diff / day))}d`;
  return new Date(value).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
}

function collegeName(college?: string) {
  if (!college) return 'MAIT Campus';
  const match = college.match(/\(([^)]+)\)/);
  return match ? match[1] : college.split(',')[0].trim();
}

function getHandwritingFont(fontFamily?: string) {
  if (!fontFamily) return `'Caveat', cursive`;
  switch (fontFamily.trim()) {
    case 'Shadows Into Light': return `'Shadows Into Light', cursive`;
    case 'Dancing Script':     return `'Dancing Script', cursive`;
    case 'Satisfy':            return `'Satisfy', cursive`;
    case 'Playfair Display':   return `'Playfair Display', serif`;
    case 'DM Sans':            
    case 'Plus Jakarta Sans':  return `'Plus Jakarta Sans', sans-serif`;
    default:                   return `'Caveat', cursive`;
  }
}

/* ─── Validation Helper ──────────────────────────────────────────── */
export function isValidDiaryImage(url?: string | null): boolean {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim();
  if (!trimmed || trimmed === 'null' || trimmed === 'undefined') return false;
  if (trimmed.startsWith('data:image/') || trimmed.startsWith('blob:')) return true;
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('/')) {
    const lower = trimmed.toLowerCase();
    if (
      lower.includes('boneyard') ||
      lower.includes('terminal') ||
      lower.includes('code-editor') ||
      lower.includes('screenshot') ||
      lower.includes('vscode') ||
      lower.includes('localhost') ||
      lower.includes('editor') ||
      lower.includes('console')
    ) {
      return false;
    }
    return true;
  }
  return false;
}

/* ─── Skeleton card (9:16 Story Card Ratio) ──────────────────────── */
function DiaryCardSkeleton() {
  return (
    <div className="w-full aspect-[9/16] min-h-[280px] sm:min-h-[340px] rounded-2xl border border-gray-100 bg-white p-4 shadow-sm animate-pulse flex flex-col justify-between overflow-hidden relative">
      <div className="flex items-center gap-2.5 z-10">
        <div className="w-8 h-8 rounded-full bg-gray-200/80" />
        <div className="space-y-1.5 flex-1">
          <div className="h-3 w-20 bg-gray-200/80 rounded" />
          <div className="h-2 w-14 bg-gray-100 rounded" />
        </div>
      </div>
      <div className="space-y-2.5 my-auto z-10 flex flex-col items-center">
        <div className="h-3 bg-gray-200/60 rounded w-4/5" />
        <div className="h-3 bg-gray-200/60 rounded w-3/5" />
        <div className="h-3 bg-gray-200/60 rounded w-2/5" />
      </div>
      <div className="pt-2 z-10 flex justify-between items-end">
        <div className="h-5 w-16 bg-gray-100 rounded-full" />
        <div className="flex flex-col gap-2 items-center">
          <div className="w-8 h-8 rounded-full bg-gray-200/70" />
          <div className="w-8 h-8 rounded-full bg-gray-200/70" />
        </div>
      </div>
    </div>
  );
}

/* ─── Slide-Up Bottom Sheet for Comments (`max-md:bottom-sheet`) ─── */
function DiaryCommentSheet({
  entry,
  onClose,
}: {
  entry: DiaryEntry;
  onClose: () => void;
}) {
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [input, setInput] = useState('');

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    setComments((prev) => [
      ...prev,
      {
        id: String(Date.now()),
        authorName: 'You',
        authorAvatar: getAvatarDataUrl({ name: 'You', seed: 'currentUser' }),
        text: input.trim(),
        time: 'Just now',
      },
    ]);
    setInput('');
  };

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/40 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="w-full max-w-lg bg-white rounded-t-3xl sm:rounded-3xl border-t sm:border border-gray-200 shadow-2xl overflow-hidden flex flex-col max-h-[80vh] sm:max-h-[600px]"
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 320 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Sheet Header */}
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/60">
          <div className="flex items-center gap-2">
            <MessageCircle size={17} className="text-gray-700" />
            <h3 className="text-sm font-extrabold text-gray-900 font-sans tracking-tight">
              Comments ({comments.length})
            </h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200/80 flex items-center justify-center text-gray-600 transition-colors cursor-pointer"
            aria-label="Close comment sheet"
          >
            <X size={16} strokeWidth={2} />
          </button>
        </div>

        {/* Comments List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 font-sans">
          {comments.map((c) => (
            <div key={c.id} className="flex items-start gap-3">
              <img
                src={c.authorAvatar}
                alt={c.authorName}
                className="w-8 h-8 rounded-full object-cover ring-1 ring-gray-200 flex-shrink-0"
              />
              <div className="flex-1 bg-gray-50/90 rounded-2xl px-3.5 py-2.5 border border-gray-100/80">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-gray-900">{c.authorName}</span>
                  <span className="text-[10px] font-medium text-gray-400">{c.time}</span>
                </div>
                <p className="text-xs text-gray-700 mt-1 leading-relaxed">{c.text}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Input Bar */}
        <form onSubmit={handleSend} className="p-3 border-t border-gray-200/80 bg-white flex items-center gap-2 font-sans">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Add a comment for the author..."
            className="flex-1 bg-gray-100/90 border border-gray-200 rounded-full px-4 py-2.5 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:bg-white transition-all"
          />
          <motion.button
            type="submit"
            disabled={!input.trim()}
            whileTap={{ scale: 0.94 }}
            className={`w-9 h-9 rounded-full flex items-center justify-center transition-all cursor-pointer flex-shrink-0 ${
              input.trim()
                ? 'bg-gray-900 text-white shadow-sm hover:bg-gray-800'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }`}
            aria-label="Send comment"
          >
            <Send size={15} strokeWidth={2.2} className="ml-0.5" />
          </motion.button>
        </form>
      </motion.div>
    </motion.div>
  );
}

/* ─── Slide-Up Send / Share Modal for In-App Sharing (`max-md:bottom-sheet`) ─── */
function DiarySendSheet({
  entry,
  onClose,
}: {
  entry: DiaryEntry;
  onClose: () => void;
}) {
  const profile = useAuthStore((state) => state.profile);
  const [searchQuery, setSearchQuery] = useState('');
  const [friends, setFriends] = useState<any[]>([]);
  const [sendingId, setSendingId] = useState<string | null>(null);

  useEffect(() => {
    if (!profile?.id) return;
    let mounted = true;
    getFollowingIds(profile.id).then(({ data: ids }) => {
      if (!mounted || !ids || !ids.length) return;
      getRecentFriendWriters(ids).then(({ data }) => {
        if (!mounted) return;
        if (data && data.length) {
          setFriends(data.map((item: any) => item.author || item));
        }
      });
    });
    return () => { mounted = false; };
  }, [profile?.id]);

  const filteredFriends = friends.filter((f) =>
    !searchQuery.trim() || String(f?.name || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSendToFriend = async (friend: any) => {
    if (!profile?.id || !friend?.id) return;
    setSendingId(friend.id);
    try {
      const { ensureDirectConversation, sendDirectMessage } = await import('../../api/directChat');
      const { data: conversation } = await ensureDirectConversation({
        initiatorId: profile.id,
        peerId: friend.id,
        contextType: 'general',
        contextTitle: 'Direct chat',
      });
      if (conversation?.id) {
        await sendDirectMessage({
          conversationId: conversation.id,
          senderId: profile.id,
          receiverId: friend.id,
          message: `Check out this campus story by ${entry.author?.name || 'Student'}:\n${window.location.origin}/student/community?diaryId=${entry.id}`,
        });
        toast.success(`Sent to ${friend.name}! 🚀`);
        onClose();
      } else {
        throw new Error('Could not open conversation');
      }
    } catch (err) {
      toast.error('Sent via clipboard instead!');
      navigator.clipboard.writeText(`${window.location.origin}/student/community?diaryId=${entry.id}`);
      onClose();
    } finally {
      setSendingId(null);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/student/community?diaryId=${entry.id}`);
    toast.success('Link copied! Share anywhere.');
    onClose();
  };

  return (
    <motion.div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50 backdrop-blur-xs font-sans"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="w-full max-w-md bg-white rounded-t-3xl p-5 shadow-2xl border-t border-gray-100 flex flex-col max-h-[75vh]"
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 320 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto mb-4 shrink-0" />
        <div className="flex items-center justify-between pb-3 border-b border-gray-100 shrink-0">
          <h3 className="font-syne font-extrabold text-lg text-slate-900">Send to Campus Friend</h3>
          <button onClick={onClose} className="p-1.5 rounded-full bg-gray-100 text-slate-500 hover:text-slate-800">
            <X size={18} />
          </button>
        </div>

        <div className="mt-3 shrink-0">
          <input
            type="text"
            placeholder="Search campus friends..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl bg-gray-100 border border-transparent px-4 py-2.5 text-sm outline-none focus:bg-white focus:border-slate-300 transition-all text-slate-900 font-medium"
          />
        </div>

        <div className="mt-4 flex-1 overflow-y-auto space-y-2 pr-1">
          {filteredFriends.length > 0 ? (
            filteredFriends.map((friend) => (
              <div key={friend.id} className="flex items-center justify-between p-2.5 rounded-2xl hover:bg-gray-50 border border-transparent hover:border-gray-100 transition-all">
                <div className="flex items-center gap-3 min-w-0">
                  <img
                    src={friend.avatar_url || getAvatarDataUrl({ name: friend.name, seed: friend.id })}
                    alt={friend.name}
                    className="w-10 h-10 rounded-full object-cover shrink-0 ring-1 ring-gray-200"
                  />
                  <div className="min-w-0">
                    <p className="font-bold text-sm text-slate-900 truncate">{friend.name}</p>
                    <p className="text-xs text-slate-500 truncate">@{friend.username || 'student'}</p>
                  </div>
                </div>
                <button
                  onClick={() => handleSendToFriend(friend)}
                  disabled={sendingId === friend.id}
                  className="px-4 py-1.5 rounded-full bg-slate-900 text-white font-extrabold text-xs hover:bg-slate-800 active:scale-95 transition-all disabled:opacity-60 shrink-0 flex items-center gap-1.5 min-h-[36px]"
                >
                  <Send size={13} />
                  <span>{sendingId === friend.id ? 'Sending...' : 'Send'}</span>
                </button>
              </div>
            ))
          ) : (
            <div className="py-8 text-center text-sm text-slate-500 font-medium">
              {friends.length === 0 ? 'No following friends yet. Copy link to send outside!' : 'No friends matching your search.'}
            </div>
          )}
        </div>

        <div className="mt-4 pt-3 border-t border-gray-100 shrink-0">
          <button
            onClick={handleCopyLink}
            className="w-full rounded-xl bg-slate-100 hover:bg-slate-200/80 active:bg-slate-200 text-slate-800 font-bold text-sm py-3 flex items-center justify-center gap-2 transition-all min-h-[44px]"
          >
            <Share2 size={16} />
            <span>Copy Story Link</span>
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ─── Single diary card ('Story Card' Architecture matching 9:16 PWA) ── */
interface DiaryCardProps {
  key?: React.Key;
  entry: DiaryEntry;
  currentUserId?: string;
  onLike: (id: string) => void | Promise<void>;
  onDelete: (id: string) => void | Promise<void>;
  onClick: (entry: DiaryEntry) => void;
  index?: number;
  onCommentClick: (entry: DiaryEntry) => void;
  onShareClick: (entry: DiaryEntry) => void;
}

const DiaryCard = React.memo<DiaryCardProps>(({
  entry,
  currentUserId,
  onLike,
  onDelete,
  onClick,
  onCommentClick,
  onShareClick,
  index = 0,
}) => {
  const [showPopHeart, setShowPopHeart] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const liked = currentUserId ? (entry.liked_by || []).includes(currentUserId) : false;

  const avatarUrl =
    entry.author?.avatar_url ||
    getAvatarDataUrl({ name: entry.author?.name, seed: entry.author?.id || entry.id });

  const paperBg = entry.bg_color && entry.bg_color !== '#0D1B2A' ? entry.bg_color : '#FFFFFF';
  const textColor = entry.text_color && entry.text_color !== '#ffffff' ? entry.text_color : '#1F2937';
  const fontStyle = getHandwritingFont(entry.font_family);
  const hasImage = !imageFailed && (isValidDiaryImage(entry.image_url) || !!entry.thumbnail_url);
  const displayImageUrl = entry.thumbnail_url || entry.image_url;

  const rotations = ['-0.6deg', '0.5deg', '-0.3deg', '0.6deg', '-0.5deg', '0.4deg'];
  const baseRotate = rotations[index % rotations.length];

  const handleDoubleTap = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowPopHeart(true);
    if (!liked) {
      onLike(entry.id);
    }
    setTimeout(() => setShowPopHeart(false), 900);
  };

  return (
    <motion.article
      onClick={() => onClick(entry)}
      onDoubleClick={handleDoubleTap}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      whileHover={{ y: -5, rotate: 0 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: 'spring', damping: 24, stiffness: 280 }}
      style={{ rotate: baseRotate }}
      className="group relative w-full aspect-[9/16] min-h-[280px] sm:min-h-[340px] rounded-2xl border border-gray-200/80 bg-white shadow-[0_4px_16px_rgba(0,0,0,0.06),0_1px_3px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.1)] transition-all duration-300 cursor-pointer overflow-hidden flex flex-col justify-between select-none active:scale-[0.98]"
    >
      {/* Pop Heart Animation on Double Tap */}
      <AnimatePresence>
        {showPopHeart && (
          <motion.div
            initial={{ scale: 0.3, opacity: 0 }}
            animate={{ scale: 1.4, opacity: 1 }}
            exit={{ scale: 1.8, opacity: 0 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="absolute inset-0 z-50 flex items-center justify-center pointer-events-none"
          >
            <Heart className="w-20 h-20 fill-rose-500 text-rose-500 drop-shadow-[0_8px_24px_rgba(244,63,94,0.5)]" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Media / Background stretching Edge-to-Edge ──────────────── */}
      {hasImage ? (
        <img
          src={displayImageUrl!}
          alt="Diary moment"
          onError={() => setImageFailed(true)}
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          loading="lazy"
          decoding="async"
        />
      ) : (
        <div
          className="absolute inset-0 w-full h-full transition-transform duration-700 group-hover:scale-102"
          style={{ background: paperBg }}
        />
      )}

      {/* ── Top & Bottom Gradients (Photo Stories Only) ── */}
      {hasImage && (
        <>
          <div className="absolute top-0 inset-x-0 pt-3 sm:pt-3.5 pb-16 px-3 sm:px-3.5 bg-gradient-to-b from-black/85 via-black/45 to-transparent pointer-events-none z-10" />
          <div className="absolute bottom-0 inset-x-0 pt-24 pb-3 px-3 sm:px-3.5 bg-gradient-to-t from-black/85 via-black/45 to-transparent pointer-events-none z-10" />
        </>
      )}

      {/* ── Author Meta-Data ── */}
      <div className="relative z-20 pt-3 px-3 sm:px-3.5 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <img
            src={avatarUrl}
            alt={entry.author?.name || 'Author'}
            className="w-7 sm:w-8 h-7 sm:h-8 rounded-full object-cover ring-2 ring-white/90 shadow-md shrink-0"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src = getAvatarDataUrl({
                name: entry.author?.name,
                seed: entry.author?.id || entry.id,
              });
            }}
          />
          <div className="min-w-0 flex-1 font-sans">
            <p className={`text-xs sm:text-sm font-extrabold tracking-tight leading-snug truncate ${hasImage ? 'text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]' : 'text-slate-900'}`}>
              {entry.author?.name || 'Campus Student'}
            </p>
            <p className={`text-[10px] sm:text-[11px] font-semibold truncate leading-none mt-0.5 ${hasImage ? 'text-white/90 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]' : 'text-slate-600'}`}>
              {collegeName(entry.author?.college)} • {relativeTime(entry.created_at)}
            </p>
          </div>
        </div>
      </div>

      {/* ── Content Body Rendered Directly on Card ───────────────────── */}
      {hasImage ? (
        <div className="mt-auto" />
      ) : (
        <div className="relative z-10 flex-1 px-4 sm:px-5 py-6 flex flex-col items-center justify-center text-center overflow-hidden">
          <p
            className="leading-relaxed whitespace-pre-wrap break-words line-clamp-7"
            style={{
              fontFamily: fontStyle,
              fontSize: Math.max(16, Math.round(18 * (entry.scale || 1))),
              color: textColor,
            }}
          >
            {entry.content}
          </p>
        </div>
      )}

      {/* ── Small Likes Count on Lower Right ── */}
      <div className="relative z-20 pb-3 px-3 sm:px-3.5 pt-2 flex items-center justify-end shrink-0 mt-auto">
        <motion.button
          onClick={(e) => {
            e.stopPropagation();
            onLike(entry.id);
          }}
          whileTap={{ scale: 1.3, rotate: [0, -15, 15, -10, 0] }}
          className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full transition-all text-[11px] font-bold cursor-pointer shadow-sm active:scale-90 ${
            hasImage
              ? 'bg-black/40 backdrop-blur-md text-white border border-white/20'
              : 'bg-gray-100 sm:bg-white border border-gray-200 text-slate-700'
          }`}
          aria-label="Like story"
        >
          <Heart size={12} className={liked ? 'fill-rose-500 text-rose-500' : 'fill-transparent text-slate-500'} strokeWidth={2.2} />
          <span>{entry.likes_count || 0}</span>
        </motion.button>
      </div>
    </motion.article>
  );
});

/* ─── Parchment Paper Diary Feed (TikTok-style snap scroll) ──── */

/** Detects if the content starts with a date pattern like "Aug 12" or "12 Aug" */
function extractDatePrefix(content: string): { month: string; day: string; rest: string } | null {
  const patterns = [
    /^([A-Z][a-z]{2})\s+(\d{1,2})\b[\s\S]*/,   // "Aug 12 ..."
    /^(\d{1,2})\s+([A-Z][a-z]{2})\b[\s\S]*/,   // "12 Aug ..."
  ];
  const m1 = content.trim().match(patterns[0]);
  if (m1) {
    const rest = content.trim().slice(m1[1].length + 1 + m1[2].length).trim();
    return { month: m1[1], day: m1[2], rest: rest || content.trim() };
  }
  const m2 = content.trim().match(patterns[1]);
  if (m2) {
    const rest = content.trim().slice(m2[1].length + 1 + m2[2].length).trim();
    return { month: m2[2], day: m2[1], rest: rest || content.trim() };
  }
  return null;
}

/* ─── Single Fullscreen Parchment Card ─────────────────────────── */
function DiaryFullscreenCard({
  entry,
  currentUserId,
  onClose,
  onDelete,
  onLike,
  onBookmark,
  onCommentClick,
  onSendClick,
  hideTopClose,
}: {
  entry: DiaryEntry;
  currentUserId?: string;
  onClose: () => void;
  onDelete: (id: string) => void | Promise<void>;
  onLike: (id: string) => void | Promise<void>;
  onBookmark?: (id: string) => void | Promise<void>;
  onCommentClick: (entry: DiaryEntry) => void;
  onSendClick?: (entry: DiaryEntry) => void;
  hideTopClose?: boolean;
}) {
  const [showPopHeart, setShowPopHeart] = useState(false);
  const [showOverflowMenu, setShowOverflowMenu] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(!!entry.user_has_bookmarked);

  useEffect(() => {
    setIsBookmarked(!!entry.user_has_bookmarked);
  }, [entry.user_has_bookmarked]);

  const isOwner = currentUserId && (entry.author?.id === currentUserId || (entry as any).author_id === currentUserId);
  const liked = currentUserId ? (entry.liked_by || []).includes(currentUserId) : false;
  const fontStyle = getHandwritingFont(entry.font_family);
  const hasImage = !imageFailed && (isValidDiaryImage(entry.image_url) || !!entry.thumbnail_url);
  const displayImageUrl = entry.thumbnail_url || entry.image_url;

  // Parchment colour — use the diary's chosen bg if it's a warm/light colour, else default to tan
  const parchmentBg = (() => {
    const c = entry.bg_color;
    if (!c || c === '#0D1B2A' || c === '#ffffff' || c === '#FFFFFF') return '#DFC38F';
    return c;
  })();

  const avatarUrl =
    entry.author?.avatar_url ||
    getAvatarDataUrl({ name: entry.author?.name, seed: entry.author?.id });

  const dateInfo = !hasImage && entry.content?.trim() ? extractDatePrefix(entry.content) : null;

  const handleDoubleTap = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowPopHeart(true);
    if (!liked) onLike(entry.id);
    setTimeout(() => setShowPopHeart(false), 900);
  };

  return (
    <div
      id={`fullscreen-card-${entry.id}`}
      className="snap-always snap-start w-full shrink-0 select-none"
      style={{ height: '100dvh', background: '#071224', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '75px 0 20px' }}
      onClick={onClose}
    >
      {/* ── Parchment Paper Card ── */}
      <motion.div
        className="relative overflow-hidden"
        style={{
          width: '94%',
          height: '100%',
          maxWidth: '420px',
          background: hasImage ? '#0F172A' : parchmentBg,
          clipPath: hasImage
            ? 'none'
            : 'polygon(0 0, 42% 0, 44% 1.8%, 46% 0, 85% 0, 87% 1.5%, 89% 0, 100% 0, 100% 100%, 75% 100%, 73% 98.2%, 71% 100%, 35% 100%, 33% 98.5%, 31% 100%, 0 100%)',
          borderRadius: hasImage ? '28px' : '4px',
          boxShadow: '0 25px 80px rgba(0,0,0,0.55), inset 0 0 60px rgba(139,90,43,0.08)',
        }}
        initial={{ scale: 0.97, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', damping: 26, stiffness: 300 }}
        onClick={(e) => e.stopPropagation()}
        onDoubleClick={handleDoubleTap}
      >
        {/* Pop Heart */}
        <AnimatePresence>
          {showPopHeart && (
            <motion.div
              initial={{ scale: 0.3, opacity: 0 }}
              animate={{ scale: 1.5, opacity: 1 }}
              exit={{ scale: 1.9, opacity: 0 }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              className="absolute inset-0 z-50 flex items-center justify-center pointer-events-none"
            >
              <Heart className="w-24 h-24 fill-rose-500 text-rose-500 drop-shadow-[0_12px_32px_rgba(244,63,94,0.6)]" />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Background image for photo stories */}
        {hasImage && (
          <img
            src={displayImageUrl!}
            alt="Diary moment"
            onError={() => setImageFailed(true)}
            className="absolute inset-0 w-full h-full object-cover"
          />
        )}

        {/* Parchment texture subtle grain overlay */}
        {!hasImage && (
          <div
            className="absolute inset-0 pointer-events-none z-0"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.08'/%3E%3C/svg%3E")`,
              backgroundSize: '180px 180px',
              mixBlendMode: 'multiply',
              opacity: 0.5,
            }}
          />
        )}

        {/* Top gradient overlay for legibility */}
        <div
          className="absolute top-0 left-0 w-full pointer-events-none z-10"
          style={{
            height: '130px',
            background: hasImage
              ? 'linear-gradient(to bottom, rgba(0,0,0,0.82) 0%, rgba(0,0,0,0) 100%)'
              : 'linear-gradient(to bottom, rgba(0,0,0,0.38) 0%, rgba(0,0,0,0) 100%)',
          }}
        />

        {/* Bottom gradient for photo stories */}
        {hasImage && (
          <div
            className="absolute bottom-0 left-0 w-full pointer-events-none z-10"
            style={{ height: '180px', background: 'linear-gradient(to top, rgba(0,0,0,0.82) 0%, rgba(0,0,0,0) 100%)' }}
          />
        )}

        {/* ── Author Header ── */}
        <div
          className="absolute top-0 left-0 right-0 z-30 flex items-center justify-between px-4"
          style={{ paddingTop: 'calc(16px + env(safe-area-inset-top, 0px))' }}
        >
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <img
              src={avatarUrl}
              alt={entry.author?.name}
              className="w-9 h-9 rounded-full object-cover flex-shrink-0"
              style={{ border: '1px solid rgba(255,255,255,0.5)' }}
            />
            <div className="min-w-0 flex-1">
              <p className="text-white font-bold text-sm leading-tight truncate" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.6)' }}>
                {entry.author?.name || 'Student'}
              </p>
              <p className="text-xs font-semibold truncate" style={{ color: 'rgba(255,255,255,0.85)', textShadow: '0 1px 2px rgba(0,0,0,0.6)' }}>
                {collegeName(entry.author?.college)} • {relativeTime(entry.created_at)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0 relative">
            {isOwner && (
              <div className="relative">
                <button
                  onClick={() => setShowOverflowMenu(!showOverflowMenu)}
                  className="flex items-center justify-center cursor-pointer active:scale-90"
                  aria-label="Story options"
                  style={{ minHeight: '44px', minWidth: '44px' }}
                >
                  <MoreHorizontal size={20} strokeWidth={2} style={{ fill: 'white', color: 'white', filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.5))' }} />
                </button>
                <AnimatePresence>
                  {showOverflowMenu && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95, y: -5 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: -5 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 top-12 w-44 bg-white/95 backdrop-blur-md rounded-2xl p-1.5 shadow-xl border border-gray-200 z-50 font-sans"
                    >
                      <button
                        onClick={() => { setShowOverflowMenu(false); onDelete(entry.id); onClose(); }}
                        className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-extrabold text-rose-600 hover:bg-rose-50 transition-colors text-left"
                      >
                        <Trash2 size={15} strokeWidth={2} />
                        <span>Delete Story</span>
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>

        {/* ── Content Area ── */}
        <div
          className="absolute inset-0 z-20 flex flex-col pr-16"
          style={{ paddingTop: '75px', paddingBottom: '24px', paddingLeft: '16px' }}
        >
          {!hasImage && entry.content?.trim() && (
            dateInfo ? (
              /* Blue date-badge + gradient box layout (top-aligned) */
              <div style={{ marginTop: '28px', width: '100%' }}>
                <div style={{ display: 'flex', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', overflow: 'hidden' }}>
                  {/* Date badge */}
                  <div style={{ background: 'white', width: '52px', flexShrink: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                    <div style={{ background: '#3eb4f0', color: 'white', fontSize: '13px', fontWeight: 700, textAlign: 'center', padding: '6px 0', fontFamily: 'sans-serif' }}>
                      {dateInfo.month}
                    </div>
                    <div style={{ color: '#333', fontSize: '18px', fontWeight: 700, textAlign: 'center', padding: '8px 0', fontFamily: 'sans-serif' }}>
                      {dateInfo.day}
                    </div>
                  </div>
                  {/* Text box */}
                  <div style={{ background: 'linear-gradient(90deg, #3eb4f0 0%, #135dd6 100%)', color: 'white', padding: '14px 16px', flexGrow: 1, fontSize: '16px', fontWeight: 500, lineHeight: 1.35, fontFamily: fontStyle }}>
                    {dateInfo.rest}
                  </div>
                </div>
              </div>
            ) : (
              /* Pink-purple gradient box layout (vertically centred) */
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div
                  style={{
                    background: 'linear-gradient(90deg, #f02577 0%, #451073 100%)',
                    color: 'white',
                    padding: '16px 20px',
                    borderRadius: '8px',
                    fontSize: Math.min(22, Math.max(15, Math.round(19 * (entry.scale || 1)))),
                    fontWeight: 500,
                    textAlign: 'center',
                    lineHeight: 1.45,
                    boxShadow: '0 4px 16px rgba(0,0,0,0.18)',
                    fontFamily: fontStyle,
                    width: '100%',
                  }}
                >
                  {entry.content}
                </div>
              </div>
            )
          )}
        </div>

        {/* ── Right-side Action Rail ── */}
        <div
          className="absolute right-3 z-30 flex flex-col items-center"
          style={{ bottom: 'calc(1.5rem + env(safe-area-inset-bottom, 0px))', gap: '22px' }}
        >
          {/* Like */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
            <motion.button
              onClick={() => onLike(entry.id)}
              whileTap={{ scale: 1.5, rotate: [0, -15, 15, -10, 0] }}
              whileHover={{ scale: 1.1 }}
              className="flex items-center justify-center cursor-pointer"
              style={{ minHeight: '44px', minWidth: '44px' }}
              aria-label="Like story"
            >
              <Heart
                size={32}
                style={{
                  fill: liked ? '#f43f5e' : 'white',
                  color: liked ? '#f43f5e' : 'white',
                  filter: liked ? 'drop-shadow(0 4px 10px rgba(244,63,94,0.6))' : 'drop-shadow(0 2px 4px rgba(0,0,0,0.25))',
                }}
                strokeWidth={liked ? 0 : 2}
              />
            </motion.button>
            <span style={{ color: 'white', fontSize: '12px', fontWeight: 600, textShadow: '0 1px 2px rgba(0,0,0,0.4)' }}>
              {entry.likes_count || 0}
            </span>
          </div>

          {/* Comment */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
            <motion.button
              onClick={() => onCommentClick(entry)}
              whileTap={{ scale: 1.3 }}
              whileHover={{ scale: 1.1 }}
              className="flex items-center justify-center cursor-pointer"
              style={{ minHeight: '44px', minWidth: '44px' }}
              aria-label="Comment on story"
            >
              <MessageCircle size={32} style={{ fill: 'white', color: 'white', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.25))' }} strokeWidth={0} />
            </motion.button>
            <span style={{ color: 'white', fontSize: '12px', fontWeight: 600, textShadow: '0 1px 2px rgba(0,0,0,0.4)' }}>
              {entry.comments_count || 0}
            </span>
          </div>

          {/* Gift */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
            <motion.button
              onClick={() => toast.success('Send reputation gift to support this author!')}
              whileTap={{ scale: 1.3 }}
              whileHover={{ scale: 1.1 }}
              className="flex items-center justify-center cursor-pointer"
              style={{ minHeight: '44px', minWidth: '44px' }}
              aria-label="Send gift"
            >
              <Gift size={30} style={{ fill: 'white', color: 'white', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.25))' }} strokeWidth={0} />
            </motion.button>
          </div>

          {/* Send / Share */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
            <motion.button
              onClick={() => onSendClick && onSendClick(entry)}
              whileTap={{ scale: 1.3 }}
              whileHover={{ scale: 1.1 }}
              className="flex items-center justify-center cursor-pointer"
              style={{ minHeight: '44px', minWidth: '44px' }}
              aria-label="Send story"
            >
              <Send size={28} style={{ fill: 'white', color: 'white', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.25))' }} strokeWidth={0} />
            </motion.button>
          </div>

          {/* Bookmark */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
            <motion.button
              onClick={() => { const next = !isBookmarked; setIsBookmarked(next); if (onBookmark) onBookmark(entry.id); }}
              whileTap={{ scale: 1.4, rotate: [0, -10, 10, 0] }}
              whileHover={{ scale: 1.1 }}
              className="flex items-center justify-center cursor-pointer"
              style={{ minHeight: '44px', minWidth: '44px' }}
              aria-label="Save story"
            >
              <Bookmark
                size={28}
                style={{
                  fill: isBookmarked ? '#fbbf24' : 'white',
                  color: isBookmarked ? '#fbbf24' : 'white',
                  filter: isBookmarked ? 'drop-shadow(0 4px 10px rgba(251,191,36,0.6))' : 'drop-shadow(0 2px 4px rgba(0,0,0,0.25))',
                }}
                strokeWidth={0}
              />
            </motion.button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

/* ─── Fullscreen Diary View (Vertical Swipe Reel + PWA Story Sheet) ──── */
export function DiaryFullscreen({
  entry,
  allEntries = [],
  currentUserId,
  currentFilter = 'new',
  onFilterChange,
  onOpenCreate,
  onClose,
  onDelete,
  onLike,
  onBookmark,
  onCommentClick,
  onShareClick,
  onSendClick,
}: {
  entry: DiaryEntry;
  allEntries?: DiaryEntry[];
  currentUserId?: string;
  currentFilter?: string;
  onFilterChange?: (filter: any) => void;
  onOpenCreate?: () => void;
  onClose: () => void;
  onDelete: (id: string) => void | Promise<void>;
  onLike: (id: string) => void | Promise<void>;
  onBookmark?: (id: string) => void | Promise<void>;
  onCommentClick: (entry: DiaryEntry) => void;
  onShareClick: (entry: DiaryEntry) => void;
  onSendClick?: (entry: DiaryEntry) => void;
}) {
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const listToRender = allEntries.length > 0 ? allEntries : [entry];

  useEffect(() => {
    document.body.classList.add('diary-fullscreen-open');
    const target = document.getElementById(`fullscreen-card-${entry.id}`);
    if (target) {
      target.scrollIntoView({ behavior: 'instant', block: 'start' });
    }
    return () => {
      document.body.classList.remove('diary-fullscreen-open');
    };
  }, [entry.id]);

  return (
    <motion.div
      className="fixed inset-0 z-50 flex flex-col overflow-y-scroll snap-y snap-mandatory snap-always no-scrollbar"
      style={{ background: '#071224' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      {/* Top Navigation Bar — floats over parchment */}
      <div
        className="fixed top-0 inset-x-0 z-[60] flex items-center justify-between px-5 pointer-events-auto"
        style={{
          paddingTop: 'calc(24px + env(safe-area-inset-top, 0px))',
          paddingBottom: '16px',
          background: 'linear-gradient(to bottom, rgba(7,18,36,0.9) 0%, rgba(7,18,36,0) 100%)',
        }}
      >
        {/* Left: Filter selector */}
        <div className="relative">
          <button
            onClick={(e) => { e.stopPropagation(); setShowFilterDropdown((prev) => !prev); }}
            className="flex items-center gap-1.5 text-white font-semibold cursor-pointer"
            style={{ fontSize: '17px' }}
          >
            <span>
              {currentFilter === 'friends' || currentFilter === 'following'
                ? 'Friends'
                : currentFilter === 'popular'
                ? 'Popular'
                : currentFilter === 'mine'
                ? 'Mine'
                : 'New'}
            </span>
            <ChevronDown size={14} strokeWidth={2.5} className={`transition-transform duration-200 ${showFilterDropdown ? 'rotate-180' : ''}`} />
          </button>

          {showFilterDropdown && (
            <div className="absolute top-full left-0 mt-2 w-36 bg-slate-900/95 border border-white/15 rounded-2xl shadow-2xl py-1.5 backdrop-blur-md overflow-hidden z-50">
              {[
                { id: 'friends', label: 'Friends', icon: '👥' },
                { id: 'popular', label: 'Popular', icon: '🔥' },
                { id: 'new', label: 'New', icon: '✨' },
                { id: 'mine', label: 'Mine', icon: '📖' },
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onFilterChange) onFilterChange(item.id as any);
                    setShowFilterDropdown(false);
                  }}
                  className={`w-full px-3 py-2 text-left flex items-center gap-2 text-xs sm:text-sm font-bold transition-colors cursor-pointer ${
                    currentFilter === item.id || (currentFilter === 'following' && item.id === 'friends')
                      ? 'bg-indigo-600/50 text-indigo-200 font-extrabold'
                      : 'text-slate-200 hover:bg-white/10'
                  }`}
                >
                  <span>{item.icon}</span>
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right: Create Pill + Close X */}
        <div className="flex items-center gap-4">
          <button
            onClick={(e) => { e.stopPropagation(); if (onOpenCreate) onOpenCreate(); else onClose(); }}
            className="flex items-center gap-1.5 cursor-pointer active:scale-95 transition-transform"
            style={{
              background: 'white',
              color: '#3bb2ec',
              border: 'none',
              padding: '6px 14px',
              borderRadius: '20px',
              fontWeight: 700,
              fontSize: '14px',
            }}
          >
            <span>✍️</span>
            <span>Create</span>
          </button>

          <button
            onClick={(e) => { e.stopPropagation(); onClose(); }}
            className="flex items-center justify-center cursor-pointer active:scale-90 transition-transform"
            style={{ background: 'none', border: 'none', minHeight: '44px', minWidth: '44px' }}
            aria-label="Close diary reel"
          >
            <X size={20} strokeWidth={2.5} style={{ color: 'white' }} />
          </button>
        </div>
      </div>

      {listToRender.map((item) => (
        <DiaryFullscreenCard
          key={item.id}
          entry={item}
          currentUserId={currentUserId}
          onClose={onClose}
          onDelete={onDelete}
          onLike={onLike}
          onBookmark={onBookmark}
          onCommentClick={onCommentClick}
          onSendClick={onSendClick || onShareClick}
          hideTopClose={true}
        />
      ))}
    </motion.div>
  );
}

/* ─── Main Component ─────────────────────────────────────────────── */
export const DiaryMasonryGrid: React.FC<DiaryMasonryGridProps> = ({
  filter = 'new',
  followingIds = [],
  newEntry,
  onFilterChange,
  onOpenCreate,
}) => {
  const profile = useAuthStore((s) => s.profile);
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const diaryIdParam = searchParams.get('diaryId');
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [viewEntry, setViewEntry] = useState<DiaryEntry | null>(null);
  const [commentEntry, setCommentEntry] = useState<DiaryEntry | null>(null);
  const [sendEntry, setSendEntry] = useState<DiaryEntry | null>(null);
  const loadedRef = useRef(false);
  const closingRef = useRef(false);

  // Sync individual diary link when URL parameter is present
  useEffect(() => {
    if (closingRef.current) return;
    
    // If the URL param is missing but a diary is open, user pressed the hardware "Back" button
    if (!diaryIdParam) {
      if (viewEntry) {
        setViewEntry(null);
      }
      return;
    }

    if (viewEntry?.id === diaryIdParam) return;
    
    const found = entries.find((e) => e.id === diaryIdParam);
    if (found) {
      setViewEntry(found);
    } else if (!isLoading && entries.length > 0) {
      supabase
        .from('diary_entries')
        .select('*, profiles:author_id(id, name, username, avatar_url, college)')
        .eq('id', diaryIdParam)
        .single()
        .then(({ data }) => {
          if (data && !closingRef.current) {
            const formatted: DiaryEntry = {
              id: data.id,
              content: data.content,
              font_family: data.font_family,
              text_color: data.text_color,
              bg_color: data.bg_color,
              gradient: data.gradient,
              image_url: data.image_url,
              scale: data.scale || 1,
              likes_count: data.likes_count || 0,
              liked_by: data.liked_by || [],
              created_at: data.created_at,
              author: data.profiles
                ? {
                    id: data.profiles.id,
                    name: data.profiles.name || data.profiles.username || 'Student',
                    username: data.profiles.username || 'student',
                    avatar_url: data.profiles.avatar_url,
                    college: data.profiles.college,
                  }
                : undefined,
            };
            setViewEntry(formatted);
          }
        });
    }
  }, [diaryIdParam, entries, isLoading, viewEntry?.id]);

  const handleCardClick = useCallback((entry: DiaryEntry) => {
    closingRef.current = false;
    setViewEntry(entry);
    const params = new URLSearchParams(window.location.search);
    params.set('diaryId', entry.id);
    // Push the state so the hardware "Back" button works correctly
    setSearchParams(params);
  }, [setSearchParams]);

  const handleCloseFullscreen = useCallback(() => {
    closingRef.current = true;
    setViewEntry(null);
    
    if (window.history.state && window.history.state.idx > 0) {
      navigate(-1);
    } else {
      const params = new URLSearchParams(window.location.search);
      params.delete('diaryId');
      setSearchParams(params, { replace: true });
    }
    
    setTimeout(() => {
      closingRef.current = false;
    }, 400);
  }, [navigate, setSearchParams]);

  const load = useCallback(async (pageNum: number, resetEntries = false) => {
    setIsLoading(true);
    try {
      const { data, error } = await getDiaryFeed(
        pageNum,
        filter,
        profile?.id || null,
        followingIds
      );
      if (error) throw error;
      setEntries((prev) => (resetEntries || pageNum === 0) ? data : [...prev, ...data]);
      setHasMore(data.length === 10);
    } catch (err: any) {
      toast.error(err?.message || 'Could not load campus diaries');
    } finally {
      setIsLoading(false);
    }
  }, [filter, profile?.id, followingIds.join(',')]); // eslint-disable-line

  // Reload when filter changes
  useEffect(() => {
    setPage(0);
    setEntries([]);
    loadedRef.current = false;
  }, [filter]);

  useEffect(() => {
    if (!loadedRef.current) {
      loadedRef.current = true;
      load(0, true);
    }

    const handlePublished = () => {
      load(0, true);
    };
    window.addEventListener('diary_published', handlePublished);
    return () => window.removeEventListener('diary_published', handlePublished);
  }, [load]);

  // Prepend new entry
  useEffect(() => {
    if (!newEntry) return;
    setEntries((prev) => [newEntry, ...prev.filter((e) => e.id !== newEntry.id)]);
  }, [newEntry]);

  const handleLike = async (id: string) => {
    if (!profile?.id) { toast.error('Sign in to like campus diaries'); return; }

    // Optimistic update
    setEntries((prev) =>
      prev.map((e) => {
        if (e.id !== id) return e;
        const alreadyLiked = (e.liked_by || []).includes(profile.id);
        return {
          ...e,
          likes_count: Math.max(0, (e.likes_count || 0) + (alreadyLiked ? -1 : 1)),
          liked_by: alreadyLiked
            ? (e.liked_by || []).filter((uid) => uid !== profile.id)
            : [...(e.liked_by || []), profile.id],
        };
      })
    );
    if (viewEntry?.id === id) {
      setViewEntry((prev) => {
        if (!prev) return prev;
        const alreadyLiked = (prev.liked_by || []).includes(profile.id);
        return {
          ...prev,
          likes_count: Math.max(0, (prev.likes_count || 0) + (alreadyLiked ? -1 : 1)),
          liked_by: alreadyLiked
            ? (prev.liked_by || []).filter((uid) => uid !== profile.id)
            : [...(prev.liked_by || []), profile.id],
        };
      });
    }

    const { error } = await toggleDiaryLike(id, profile.id);
    if (error) {
      toast.error('Could not update like');
      load(0, true);
    }
  };

  const handleBookmark = async (id: string) => {
    if (!profile?.id) {
      toast.error('Sign in to save campus stories');
      return;
    }

    let isNowSaved = false;
    setEntries((prev) =>
      prev.map((e) => {
        if (e.id !== id) return e;
        isNowSaved = !e.user_has_bookmarked;
        return { ...e, user_has_bookmarked: isNowSaved };
      })
    );

    if (viewEntry?.id === id) {
      setViewEntry((prev) => (prev ? { ...prev, user_has_bookmarked: !prev.user_has_bookmarked } : prev));
    }

    const { data, error } = await toggleDiaryBookmark(id, profile.id);
    if (error) {
      toast.error('Could not update bookmark');
      load(0, true);
    } else {
      toast.success(data?.bookmarked ? 'Saved to Bookmarks' : 'Removed from Bookmarks');
    }
  };

  const handleDelete = async (id: string) => {
    if (!profile?.id) return;
    if (!window.confirm('Remove this story from Campus Diaries?')) return;
    const { error } = await deleteDiaryEntry(id, profile.id);
    if (error) { toast.error(error.message || 'Failed to delete'); return; }
    setEntries((prev) => prev.filter((e) => e.id !== id));
    if (viewEntry?.id === id) {
      handleCloseFullscreen();
    }
    toast.success('Diary entry removed');
  };

  const handleShare = useCallback(async (entry: DiaryEntry) => {
    const diaryUrl = `${window.location.origin}/student/community?diaryId=${entry.id}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Campus Diaries • ${entry.author?.name || 'Story'}`,
          text: entry.content || 'Check out this campus moment!',
          url: diaryUrl,
        });
      } catch (err) {
        // User cancelled or share dismissed
      }
    } else {
      navigator.clipboard.writeText(diaryUrl);
      toast.success('Individual diary link copied! Share to WhatsApp or any app.');
    }
  }, []);

  /* Custom Illustrated Empty State with stacked story card outlines */
  if (!isLoading && entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-6 text-center max-w-lg mx-auto select-none">
        {/* Soft-Tinted Stacked Card Illustration */}
        <div className="relative w-36 h-40 mb-8 flex items-center justify-center">
          <div className="absolute -inset-4 rounded-full bg-gradient-to-tr from-amber-500/10 via-purple-500/10 to-blue-500/10 blur-xl pointer-events-none" />
          
          {/* Back left rotated story outline */}
          <div className="absolute w-24 h-32 rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200/80 shadow-md -rotate-12 -translate-x-6 translate-y-2 flex flex-col justify-between p-2.5 opacity-90">
            <div className="w-5 h-5 rounded-full bg-amber-200/70" />
            <div className="space-y-1">
              <div className="w-full h-1.5 bg-amber-200/80 rounded" />
              <div className="w-2/3 h-1.5 bg-amber-200/60 rounded" />
            </div>
          </div>

          {/* Back right rotated story outline */}
          <div className="absolute w-24 h-32 rounded-2xl bg-gradient-to-br from-purple-50 to-indigo-50 border border-purple-200/80 shadow-md rotate-12 translate-x-6 translate-y-2 flex flex-col justify-between p-2.5 opacity-90">
            <div className="w-5 h-5 rounded-full bg-purple-200/70" />
            <div className="space-y-1">
              <div className="w-full h-1.5 bg-purple-200/80 rounded" />
              <div className="w-2/3 h-1.5 bg-purple-200/60 rounded" />
            </div>
          </div>

          {/* Center primary story outline */}
          <div className="relative z-10 w-28 h-36 rounded-2xl bg-white border border-gray-200/90 shadow-xl flex flex-col justify-between p-3 transform hover:scale-105 transition-transform duration-300">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-xs">
                <BookOpen size={12} strokeWidth={2} />
              </div>
              <div className="space-y-1 flex-1">
                <div className="w-12 h-2 bg-gray-200 rounded" />
                <div className="w-8 h-1.5 bg-gray-100 rounded" />
              </div>
            </div>
            <div className="my-auto space-y-1.5 flex flex-col items-center">
              <div className="w-4/5 h-2 bg-gray-100 rounded" />
              <div className="w-full h-2 bg-gray-100 rounded" />
              <div className="w-3/5 h-2 bg-gray-100 rounded" />
            </div>
            <div className="flex justify-end gap-1.5 pt-1">
              <div className="w-5 h-5 rounded-full bg-rose-50 flex items-center justify-center">
                <Heart size={10} className="text-rose-500 fill-rose-500" />
              </div>
            </div>
          </div>
        </div>

        <h3 className="font-syne text-xl sm:text-2xl font-extrabold text-gray-900 tracking-tight mb-2">
          {filter === 'friends' ? 'No stories from campus friends yet' :
           filter === 'mine'    ? 'Your campus journal is empty' :
           'The campus feed is waiting for its first story'}
        </h3>
        <p className="text-sm font-medium text-gray-500 max-w-sm leading-relaxed mb-6">
          {filter === 'mine' 
            ? 'Start writing your college journey! Capture campus moments, photo memories, and secret thoughts.' 
            : 'Be the pioneer! Share a photo memory, reflection, or campus moment to kick off the feed.'}
        </p>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* ── Responsive 9:16 Story Grid (Fluidly Collapsing to 2-Column on Mobile) ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4 lg:gap-5 items-stretch">
        {isLoading && entries.length === 0 ? (
          Array.from({ length: 8 }).map((_, i) => <DiaryCardSkeleton key={i} />)
        ) : (
          entries.map((entry, idx) => (
            <DiaryCard
              key={entry.id}
              entry={entry}
              index={idx}
              currentUserId={profile?.id}
              onLike={handleLike}
              onDelete={handleDelete}
              onClick={handleCardClick}
              onCommentClick={setCommentEntry}
              onShareClick={handleShare}
            />
          ))
        )}
      </div>

      {/* Load More Button */}
      {!isLoading && hasMore && (
        <div className="mt-10 flex justify-center">
          <button
            onClick={() => { const next = page + 1; setPage(next); load(next); }}
            className="px-8 py-3.5 text-sm font-bold text-gray-800 bg-white hover:bg-gray-50 border border-gray-200 rounded-full shadow-2xs hover:shadow-sm transition-all duration-200 font-sans flex items-center gap-2 cursor-pointer"
          >
            <span>Load more stories</span>
          </button>
        </div>
      )}

      {/* Loading Spinner */}
      {isLoading && entries.length > 0 && (
        <div className="flex justify-center mt-8">
          <div className="w-6 h-6 border-2 border-gray-200 border-t-gray-800 rounded-full animate-spin" />
        </div>
      )}

      {/* Fullscreen Story Modal */}
      <AnimatePresence>
        {viewEntry && (
          <DiaryFullscreen
            entry={viewEntry}
            allEntries={entries}
            currentUserId={profile?.id}
            currentFilter={filter}
            onFilterChange={(newFilter) => {
              if (onFilterChange) onFilterChange(newFilter);
            }}
            onOpenCreate={() => {
              handleCloseFullscreen();
              if (onOpenCreate) {
                onOpenCreate();
              } else {
                window.dispatchEvent(new CustomEvent('open-diary-creator'));
              }
            }}
            onClose={handleCloseFullscreen}
            onDelete={handleDelete}
            onLike={handleLike}
            onBookmark={handleBookmark}
            onCommentClick={setCommentEntry}
            onShareClick={handleShare}
            onSendClick={(item) => setSendEntry(item)}
          />
        )}
      </AnimatePresence>

      {/* Slide-Up Comment Bottom Sheet Modal (`max-md:bottom-sheet`) */}
      <AnimatePresence>
        {commentEntry && (
          <DiaryCommentSheet
            entry={commentEntry}
            onClose={() => setCommentEntry(null)}
          />
        )}
      </AnimatePresence>

      {/* Slide-Up Send Sheet Modal (`max-md:bottom-sheet`) */}
      <AnimatePresence>
        {sendEntry && (
          <DiarySendSheet
            entry={sendEntry}
            onClose={() => setSendEntry(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

