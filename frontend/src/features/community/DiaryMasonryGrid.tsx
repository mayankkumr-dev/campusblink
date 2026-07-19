import React, { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useSearchParams } from 'react-router';
import { Heart, Trash2, X, BookOpen, Clock, ThumbsUp, MessageCircle, Send, Share2, Gift, MoreHorizontal } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../store/authStore';
import { getDiaryFeed, toggleDiaryLike, deleteDiaryEntry } from '../../api/diary';
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
  scale: number;
  likes_count: number;
  liked_by: string[];
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
  const [comments, setComments] = useState<CommentItem[]>([
    {
      id: '1',
      authorName: 'Riya Sharma',
      authorAvatar: getAvatarDataUrl({ name: 'Riya Sharma', seed: 'riya' }),
      text: 'Such a relatable campus moment! 🔥',
      time: '12m',
    },
    {
      id: '2',
      authorName: 'Aarav Gupta',
      authorAvatar: getAvatarDataUrl({ name: 'Aarav Gupta', seed: 'aarav' }),
      text: 'Loved the vibes here, where on campus is this? ✨',
      time: '5m',
    },
  ]);
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

/* ─── Single diary card ('Story Card' Architecture matching 9:16 PWA) ── */
interface DiaryCardProps {
  key?: React.Key;
  entry: DiaryEntry;
  currentUserId?: string;
  onLike: (id: string) => void | Promise<void>;
  onDelete: (id: string) => void | Promise<void>;
  onClick: (entry: DiaryEntry) => void;
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
  const hasImage = !imageFailed && isValidDiaryImage(entry.image_url);

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
      whileHover={{ y: -5 }}
      whileTap={{ scale: 0.97 }}
      transition={{ type: 'spring', damping: 24, stiffness: 280 }}
      className="group relative w-full aspect-[9/16] min-h-[280px] sm:min-h-[340px] rounded-2xl border border-gray-100/90 bg-white shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer overflow-hidden flex flex-col justify-between select-none"
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
          src={entry.image_url!}
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

      {/* ── Top & Bottom Dark-to-Transparent CSS Gradients strictly at edges for high contrast (Photo Stories Only) ── */}
      {hasImage && (
        <>
          <div className="absolute top-0 inset-x-0 pt-3 sm:pt-3.5 pb-16 px-3 sm:px-3.5 bg-gradient-to-b from-black/85 via-black/45 to-transparent pointer-events-none z-10" />
          <div className="absolute bottom-0 inset-x-0 pt-20 pb-3 px-3 sm:px-3.5 bg-gradient-to-t from-black/85 via-black/45 to-transparent pointer-events-none z-10" />
        </>
      )}

      {/* ── Author Meta-Data cleanly over top gradient in crisp text ── */}
      <div className="relative z-20 pt-3 px-3 sm:px-3.5 flex items-center justify-between">
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
        entry.content?.trim() ? (
          <div className="relative z-10 mb-16 mx-3">
            <div className="bg-white/95 backdrop-blur-md rounded-xl py-2 px-3 shadow-lg border border-white/80 text-center">
              <p
                className="text-xs sm:text-sm font-semibold text-gray-800 line-clamp-3 leading-relaxed break-words"
                style={{ fontFamily: fontStyle }}
              >
                {entry.content}
              </p>
            </div>
          </div>
        ) : <div />
      ) : (
        <div className="relative z-10 flex-1 px-4 sm:px-5 py-8 flex flex-col items-center justify-center text-center overflow-hidden">
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

      {/* ── Action Rail Stacked on Bottom-Right (Only Like & Comment at Thumbnail Size) ── */}
      <div className="absolute bottom-3 right-2.5 z-20 flex flex-col items-center gap-3">
        {/* Like Button */}
        <div className="flex flex-col items-center">
          <motion.button
            onClick={(e) => {
              e.stopPropagation();
              onLike(entry.id);
            }}
            whileTap={{ scale: 1.5, rotate: [0, -15, 15, -10, 0] }}
            whileHover={{ scale: 1.1 }}
            className={`w-11 h-11 rounded-full flex items-center justify-center transition-all shadow-md backdrop-blur-md border cursor-pointer min-h-[44px] min-w-[44px] ${
              liked
                ? 'bg-rose-500 border-rose-600 text-white'
                : 'bg-black/45 border-white/25 text-white hover:bg-black/65'
            }`}
            aria-label="Like story"
          >
            <Heart
              size={18}
              className={liked ? 'fill-white text-white' : 'text-white'}
              strokeWidth={2.2}
            />
          </motion.button>
          <span className="text-[11px] font-extrabold text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] mt-1 leading-none">
            {entry.likes_count || 0}
          </span>
        </div>

        {/* Comment Button (Consistent Label: 'Comment') */}
        <div className="flex flex-col items-center">
          <motion.button
            onClick={(e) => {
              e.stopPropagation();
              onCommentClick(entry);
            }}
            whileTap={{ scale: 1.3 }}
            whileHover={{ scale: 1.1 }}
            className="w-11 h-11 rounded-full bg-black/45 backdrop-blur-md border border-white/25 text-white hover:bg-black/65 flex items-center justify-center shadow-md cursor-pointer min-h-[44px] min-w-[44px]"
            aria-label="Comment on story"
          >
            <MessageCircle size={18} strokeWidth={2.2} />
          </motion.button>
          <span className="text-[11px] font-extrabold text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] mt-1 leading-none">
            Comment
          </span>
        </div>

        {/* Share Button (Individual Diary Link) */}
        <div className="flex flex-col items-center">
          <motion.button
            onClick={(e) => {
              e.stopPropagation();
              onShareClick(entry);
            }}
            whileTap={{ scale: 1.3 }}
            whileHover={{ scale: 1.1 }}
            className="w-11 h-11 rounded-full bg-black/45 backdrop-blur-md border border-white/25 text-white hover:bg-black/65 flex items-center justify-center shadow-md cursor-pointer min-h-[44px] min-w-[44px]"
            aria-label="Share story link"
          >
            <Share2 size={17} strokeWidth={2.2} className="ml-0.5" />
          </motion.button>
          <span className="text-[11px] font-extrabold text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] mt-1 leading-none">
            Share
          </span>
        </div>
      </div>
    </motion.article>
  );
});

/* ─── Fullscreen Diary View (Strict Light Mode + PWA Story Sheet) ──── */
export function DiaryFullscreen({
  entry,
  currentUserId,
  onClose,
  onDelete,
  onLike,
  onCommentClick,
  onShareClick,
}: {
  entry: DiaryEntry;
  currentUserId?: string;
  onClose: () => void;
  onDelete: (id: string) => void | Promise<void>;
  onLike: (id: string) => void | Promise<void>;
  onCommentClick: (entry: DiaryEntry) => void;
  onShareClick: (entry: DiaryEntry) => void;
}) {
  const [showPopHeart, setShowPopHeart] = useState(false);
  const [showOverflowMenu, setShowOverflowMenu] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);

  const isOwner = currentUserId && (entry.author?.id === currentUserId || (entry as any).author_id === currentUserId);
  const liked = currentUserId ? (entry.liked_by || []).includes(currentUserId) : false;
  const paperBg = entry.bg_color && entry.bg_color !== '#0D1B2A' ? entry.bg_color : '#FFFFFF';
  const textColor = entry.text_color && entry.text_color !== '#ffffff' ? entry.text_color : '#1F2937';
  const fontStyle = getHandwritingFont(entry.font_family);
  const hasImage = !imageFailed && isValidDiaryImage(entry.image_url);

  const avatarUrl =
    entry.author?.avatar_url ||
    getAvatarDataUrl({ name: entry.author?.name, seed: entry.author?.id });

  const handleDoubleTap = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowPopHeart(true);
    if (!liked) {
      onLike(entry.id);
    }
    setTimeout(() => setShowPopHeart(false), 900);
  };

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
      style={{ background: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(16px)' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      onClick={onClose}
    >
      <motion.div
        className="w-full max-w-md aspect-[9/16] min-h-[500px] max-h-[92vh] rounded-3xl border border-gray-200/80 shadow-[0_25px_80px_rgba(0,0,0,0.28)] overflow-hidden flex flex-col relative my-auto select-none bg-white"
        style={{
          background: hasImage ? '#0F172A' : paperBg,
        }}
        initial={{ scale: 0.94, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.94, y: 20 }}
        transition={{ type: 'spring', damping: 26, stiffness: 300 }}
        onClick={(e) => e.stopPropagation()}
        onDoubleClick={handleDoubleTap}
      >
        {/* Pop Heart Animation on Double Tap inside Fullscreen */}
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

        {/* If image card, render background image edge-to-edge with error fallback */}
        {hasImage && (
          <img
            src={entry.image_url!}
            alt="Fullscreen memory"
            onError={() => setImageFailed(true)}
            className="absolute inset-0 w-full h-full object-cover"
          />
        )}

        {/* Top & Bottom Dark Gradient Overlay strictly for Photo Stories */}
        {hasImage && (
          <>
            <div className="absolute top-0 inset-x-0 pt-4 pb-24 px-5 bg-gradient-to-b from-black/85 via-black/45 to-transparent pointer-events-none z-10" />
            <div className="absolute bottom-0 inset-x-0 pt-36 pb-6 px-5 bg-gradient-to-t from-black/85 via-black/45 to-transparent pointer-events-none z-10" />
          </>
        )}

        {/* Top bar with Author Info & Calm Overflow Header */}
        <div
          className="relative z-30 flex items-center justify-between px-5 pb-2"
          style={{ paddingTop: `calc(1rem + env(safe-area-inset-top, 0px))` }}
        >
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <img
              src={avatarUrl}
              alt={entry.author?.name}
              className="w-10 h-10 rounded-full object-cover ring-2 ring-white shadow-md shrink-0"
            />
            <div className="min-w-0 flex-1 font-sans">
              <p className={`text-sm font-extrabold leading-tight truncate ${hasImage ? 'text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]' : 'text-slate-900'}`}>
                {entry.author?.name || 'Student'}
              </p>
              <p className={`text-xs font-semibold mt-0.5 truncate ${hasImage ? 'text-white/90 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]' : 'text-slate-600'}`}>
                {collegeName(entry.author?.college)} • {relativeTime(entry.created_at)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 relative">
            {/* Calm Overflow Menu instead of always-visible red Delete button */}
            {isOwner && (
              <div className="relative">
                <button
                  onClick={() => setShowOverflowMenu(!showOverflowMenu)}
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-all shadow-sm cursor-pointer active:scale-90 min-h-[44px] min-w-[44px] ${
                    hasImage
                      ? 'bg-black/45 hover:bg-black/65 border border-white/25 text-white'
                      : 'bg-white/90 hover:bg-white border border-slate-200 text-slate-700'
                  }`}
                  aria-label="Story options"
                >
                  <MoreHorizontal size={18} strokeWidth={2} />
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
                        onClick={() => {
                          setShowOverflowMenu(false);
                          onDelete(entry.id);
                          onClose();
                        }}
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

            <button
              onClick={onClose}
              className={`w-10 h-10 rounded-full flex items-center justify-center transition-all shadow-sm cursor-pointer active:scale-90 min-h-[44px] min-w-[44px] ${
                hasImage
                  ? 'bg-black/45 hover:bg-black/65 border border-white/25 text-white'
                  : 'bg-white/90 hover:bg-white border border-slate-200 text-slate-700'
              }`}
              aria-label="Close"
            >
              <X size={18} strokeWidth={2} />
            </button>
          </div>
        </div>

        {/* Content Area with Guaranteed Safe Content Zone away from Action Rail, Top Bar, and Bottom Edge */}
        <div className="relative z-10 flex-1 pt-24 pb-20 pl-6 sm:pl-8 pr-20 sm:pr-24 flex flex-col justify-center items-center text-center overflow-y-auto scrollbar-none max-h-full">
          {entry.content?.trim() && (
            <div
              className={
                hasImage
                  ? 'bg-white/95 backdrop-blur-md rounded-2xl p-4 sm:p-5 shadow-xl text-gray-900 border border-white/80 max-w-full'
                  : 'w-full'
              }
            >
              <p
                className="leading-relaxed whitespace-pre-wrap break-words"
                style={{
                  fontFamily: fontStyle,
                  fontSize: Math.min(30, Math.max(16, Math.round(22 * (entry.scale || 1)))),
                  color: hasImage ? '#1F2937' : textColor,
                }}
              >
                {entry.content}
              </p>
            </div>
          )}
        </div>

        {/* Uniform Action Rail Stacked on Right Edge inside Fullscreen (Safe from text) */}
        <div
          className="absolute right-3.5 z-20 flex flex-col items-center gap-4"
          style={{ bottom: `calc(1.5rem + env(safe-area-inset-bottom, 0px))` }}
        >
          {/* Like */}
          <div className="flex flex-col items-center">
            <motion.button
              onClick={() => onLike(entry.id)}
              whileTap={{ scale: 1.5, rotate: [0, -15, 15, -10, 0] }}
              whileHover={{ scale: 1.1 }}
              className={`w-11 h-11 rounded-full flex items-center justify-center transition-all shadow-lg backdrop-blur-md border cursor-pointer min-h-[44px] min-w-[44px] ${
                liked
                  ? 'bg-rose-500 border-rose-600 text-white'
                  : hasImage
                  ? 'bg-black/50 border-white/30 text-white hover:bg-black/70'
                  : 'bg-white/90 border-slate-200/80 text-slate-700 hover:bg-white'
              }`}
              aria-label="Like story"
            >
              <Heart
                size={20}
                className={liked ? 'fill-white text-white' : hasImage ? 'text-white' : 'text-slate-700'}
                strokeWidth={2.2}
              />
            </motion.button>
            <span className={`text-xs font-extrabold mt-1.5 leading-none ${hasImage ? 'text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]' : 'text-slate-800'}`}>
              {entry.likes_count || 0}
            </span>
          </div>

          {/* Comment (Consistent label: 'Comment') */}
          <div className="flex flex-col items-center">
            <motion.button
              onClick={() => onCommentClick(entry)}
              whileTap={{ scale: 1.3 }}
              whileHover={{ scale: 1.1 }}
              className={`w-11 h-11 rounded-full flex items-center justify-center transition-all shadow-lg backdrop-blur-md border cursor-pointer min-h-[44px] min-w-[44px] ${
                hasImage
                  ? 'bg-black/50 border-white/30 text-white hover:bg-black/70'
                  : 'bg-white/90 border-slate-200/80 text-slate-700 hover:bg-white'
              }`}
              aria-label="Comment on story"
            >
              <MessageCircle size={20} strokeWidth={2.2} />
            </motion.button>
            <span className={`text-xs font-extrabold mt-1.5 leading-none ${hasImage ? 'text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]' : 'text-slate-800'}`}>
              Comment
            </span>
          </div>

          {/* Gift / Reward */}
          <div className="flex flex-col items-center">
            <motion.button
              onClick={() => toast.success('Send reputation gift to support this author!')}
              whileTap={{ scale: 1.3 }}
              whileHover={{ scale: 1.1 }}
              className={`w-11 h-11 rounded-full flex items-center justify-center transition-all shadow-lg backdrop-blur-md border cursor-pointer min-h-[44px] min-w-[44px] ${
                hasImage
                  ? 'bg-black/50 border-white/30 text-amber-300 hover:bg-black/70'
                  : 'bg-white/90 border-slate-200/80 text-amber-600 hover:bg-white'
              }`}
              aria-label="Send gift"
            >
              <Gift size={20} strokeWidth={2.2} />
            </motion.button>
            <span className={`text-xs font-extrabold mt-1.5 leading-none ${hasImage ? 'text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]' : 'text-slate-800'}`}>
              Gift
            </span>
          </div>

          {/* Share */}
          <div className="flex flex-col items-center">
            <motion.button
              onClick={() => onShareClick(entry)}
              whileTap={{ scale: 1.3 }}
              whileHover={{ scale: 1.1 }}
              className={`w-11 h-11 rounded-full flex items-center justify-center transition-all shadow-lg backdrop-blur-md border cursor-pointer min-h-[44px] min-w-[44px] ${
                hasImage
                  ? 'bg-black/50 border-white/30 text-white hover:bg-black/70'
                  : 'bg-white/90 border-slate-200/80 text-slate-700 hover:bg-white'
              }`}
              aria-label="Share story"
            >
              <Share2 size={19} strokeWidth={2.2} className="ml-0.5" />
            </motion.button>
            <span className={`text-xs font-extrabold mt-1.5 leading-none ${hasImage ? 'text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]' : 'text-slate-800'}`}>
              Share
            </span>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ─── Main Component ─────────────────────────────────────────────── */
export const DiaryMasonryGrid: React.FC<DiaryMasonryGridProps> = ({
  filter = 'new',
  followingIds = [],
  newEntry,
}) => {
  const profile = useAuthStore((s) => s.profile);
  const [searchParams, setSearchParams] = useSearchParams();
  const diaryIdParam = searchParams.get('diaryId');
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [viewEntry, setViewEntry] = useState<DiaryEntry | null>(null);
  const [commentEntry, setCommentEntry] = useState<DiaryEntry | null>(null);
  const loadedRef = useRef(false);

  // Sync individual diary link when URL parameter is present
  useEffect(() => {
    if (!diaryIdParam || viewEntry?.id === diaryIdParam) return;
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
          if (data) {
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
    setViewEntry(entry);
    const params = new URLSearchParams(window.location.search);
    params.set('diaryId', entry.id);
    setSearchParams(params, { replace: true });
  }, [setSearchParams]);

  const handleCloseFullscreen = useCallback(() => {
    setViewEntry(null);
    const params = new URLSearchParams(window.location.search);
    params.delete('diaryId');
    setSearchParams(params, { replace: true });
  }, [setSearchParams]);

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
      setHasMore(data.length === 20);
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
          entries.map((entry) => (
            <DiaryCard
              key={entry.id}
              entry={entry}
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
            currentUserId={profile?.id}
            onClose={handleCloseFullscreen}
            onDelete={handleDelete}
            onLike={handleLike}
            onCommentClick={setCommentEntry}
            onShareClick={handleShare}
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
    </div>
  );
};

