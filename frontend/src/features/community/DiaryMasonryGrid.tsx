import React, { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Heart, Trash2, X, BookOpen, Clock, ThumbsUp, MessageCircle, Send, Share2, Gift } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../store/authStore';
import { getDiaryFeed, toggleDiaryLike, deleteDiaryEntry } from '../../api/diary';
import { getAvatarDataUrl } from '../../lib/avatar';

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
function DiaryCard({
  entry,
  currentUserId,
  onLike,
  onDelete,
  onClick,
  onCommentClick,
  onShareClick,
}: {
  entry: DiaryEntry;
  currentUserId?: string;
  onLike: (id: string) => void | Promise<void>;
  onDelete: (id: string) => void | Promise<void>;
  onClick: (entry: DiaryEntry) => void;
  onCommentClick: (entry: DiaryEntry) => void;
  onShareClick: (entry: DiaryEntry) => void;
}) {
  const liked = currentUserId ? (entry.liked_by || []).includes(currentUserId) : false;

  const avatarUrl =
    entry.author?.avatar_url ||
    getAvatarDataUrl({ name: entry.author?.name, seed: entry.author?.id || entry.id });

  // Strictly enforce light mode tone or pure white
  const paperBg = entry.bg_color && entry.bg_color !== '#0D1B2A' ? entry.bg_color : '#FFFFFF';
  const textColor = entry.text_color && entry.text_color !== '#ffffff' ? entry.text_color : '#1F2937';
  const fontStyle = getHandwritingFont(entry.font_family);
  const hasImage = Boolean(entry.image_url);

  return (
    <motion.article
      onClick={() => onClick(entry)}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      whileHover={{ y: -5 }}
      transition={{ type: 'spring', damping: 24, stiffness: 280 }}
      className="group relative w-full aspect-[9/16] min-h-[280px] sm:min-h-[340px] rounded-2xl border border-gray-100/90 bg-white shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer overflow-hidden flex flex-col justify-between select-none"
    >
      {/* ── Media / Background stretching Edge-to-Edge ──────────────── */}
      {hasImage ? (
        <img
          src={entry.image_url!}
          alt="Diary moment"
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          loading="lazy"
        />
      ) : (
        <div
          className="absolute inset-0 w-full h-full transition-transform duration-700 group-hover:scale-102"
          style={{
            background: paperBg !== '#FFFFFF'
              ? `linear-gradient(145deg, ${paperBg}, #F3F4F6)`
              : 'linear-gradient(145deg, #F8FAFC 0%, #FFFFFF 50%, #F1F5F9 100%)'
          }}
        />
      )}

      {/* ── Top Dark-to-Transparent CSS Gradient strictly at top inside edge ── */}
      <div className="absolute top-0 inset-x-0 pt-3 sm:pt-3.5 pb-16 px-3 sm:px-3.5 bg-gradient-to-b from-black/80 via-black/40 to-transparent pointer-events-none z-10" />

      {/* ── Author Meta-Data cleanly over top gradient in crisp pure white text ── */}
      <div className="relative z-20 pt-3 px-3 sm:px-3.5 flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <img
            src={avatarUrl}
            alt={entry.author?.name || 'Author'}
            className="w-7 sm:w-8 h-7 sm:h-8 rounded-full object-cover ring-2 ring-white/90 shadow-md flex-shrink-0"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src = getAvatarDataUrl({
                name: entry.author?.name,
                seed: entry.author?.id || entry.id,
              });
            }}
          />
          <div className="min-w-0 flex-1 font-sans">
            <p className="text-xs sm:text-sm font-extrabold text-white tracking-tight leading-snug truncate drop-shadow-md">
              {entry.author?.name || 'Campus Student'}
            </p>
            <p className="text-[10px] sm:text-[11px] text-white/90 font-semibold truncate drop-shadow-md leading-none mt-0.5">
              {collegeName(entry.author?.college)} • {relativeTime(entry.created_at)}
            </p>
          </div>
        </div>
      </div>

      {/* ── Content Body Rendered Directly on Card ───────────────────── */}
      {hasImage ? (
        entry.content?.trim() ? (
          <div className="relative z-10 mb-14 mx-3">
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

      {/* ── Advanced Engagement Controls Stacked Vertically on Bottom-Right (TikTok/Reels Style) ── */}
      <div className="absolute bottom-3 right-2 sm:right-2.5 z-20 flex flex-col items-center gap-2.5">
        {/* Like Button */}
        <div className="flex flex-col items-center">
          <motion.button
            onClick={(e) => {
              e.stopPropagation();
              onLike(entry.id);
            }}
            whileTap={{ scale: 1.5, rotate: [0, -15, 15, -10, 0] }}
            whileHover={{ scale: 1.1 }}
            className={`w-8 sm:w-9 h-8 sm:h-9 rounded-full flex items-center justify-center transition-all shadow-md backdrop-blur-md border cursor-pointer ${
              liked
                ? 'bg-rose-500 border-rose-600 text-white'
                : 'bg-black/45 border-white/25 text-white hover:bg-black/65'
            }`}
            aria-label="Like story"
          >
            <Heart
              size={16}
              className={liked ? 'fill-white text-white' : 'text-white'}
              strokeWidth={2.2}
            />
          </motion.button>
          <span className="text-[10px] sm:text-[11px] font-extrabold text-white drop-shadow-md mt-1 leading-none">
            {entry.likes_count || 0}
          </span>
        </div>

        {/* Comment Button */}
        <div className="flex flex-col items-center">
          <motion.button
            onClick={(e) => {
              e.stopPropagation();
              onCommentClick(entry);
            }}
            whileTap={{ scale: 1.3 }}
            whileHover={{ scale: 1.1 }}
            className="w-8 sm:w-9 h-8 sm:h-9 rounded-full bg-black/45 backdrop-blur-md border border-white/25 text-white hover:bg-black/65 flex items-center justify-center shadow-md cursor-pointer"
            aria-label="Comment on story"
          >
            <MessageCircle size={16} strokeWidth={2.2} />
          </motion.button>
          <span className="text-[10px] sm:text-[11px] font-extrabold text-white drop-shadow-md mt-1 leading-none">
            Chat
          </span>
        </div>

        {/* Share Button (Web Share API) */}
        <div className="flex flex-col items-center">
          <motion.button
            onClick={(e) => {
              e.stopPropagation();
              onShareClick(entry);
            }}
            whileTap={{ scale: 1.3 }}
            whileHover={{ scale: 1.1 }}
            className="w-8 sm:w-9 h-8 sm:h-9 rounded-full bg-black/45 backdrop-blur-md border border-white/25 text-white hover:bg-black/65 flex items-center justify-center shadow-md cursor-pointer"
            aria-label="Share story"
          >
            <Share2 size={15} strokeWidth={2.2} className="ml-0.5" />
          </motion.button>
          <span className="text-[10px] sm:text-[11px] font-extrabold text-white drop-shadow-md mt-1 leading-none">
            Share
          </span>
        </div>
      </div>

      {/* Bottom left subtle badge for bottom framing */}
      <div className="absolute bottom-3 left-2.5 sm:left-3 z-20 px-2.5 py-1 rounded-full bg-black/45 backdrop-blur-md border border-white/20 text-white/95 font-bold text-[10px] sm:text-[11px] flex items-center gap-1 shadow-sm pointer-events-none">
        <BookOpen size={11} className="text-amber-300 flex-shrink-0" />
        <span>Diaries</span>
      </div>
    </motion.article>
  );
}

/* ─── Fullscreen Diary View (Strict Light Mode + PWA Story Sheet) ──── */
function DiaryFullscreen({
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
  const isOwner = currentUserId && (entry.author?.id === currentUserId || (entry as any).author_id === currentUserId);
  const liked = currentUserId ? (entry.liked_by || []).includes(currentUserId) : false;
  const paperBg = entry.bg_color && entry.bg_color !== '#0D1B2A' ? entry.bg_color : '#FFFFFF';
  const textColor = entry.text_color && entry.text_color !== '#ffffff' ? entry.text_color : '#1F2937';
  const fontStyle = getHandwritingFont(entry.font_family);

  const avatarUrl =
    entry.author?.avatar_url ||
    getAvatarDataUrl({ name: entry.author?.name, seed: entry.author?.id });

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
      style={{ background: 'rgba(15, 23, 42, 0.55)', backdropFilter: 'blur(10px)' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      onClick={onClose}
    >
      <motion.div
        className="w-full max-w-md aspect-[9/16] min-h-[500px] max-h-[92vh] rounded-3xl border border-gray-200/80 shadow-[0_25px_80px_rgba(0,0,0,0.18)] overflow-hidden flex flex-col relative my-auto select-none bg-white"
        style={{
          background: entry.image_url
            ? '#0F172A'
            : paperBg !== '#FFFFFF'
            ? `linear-gradient(150deg, ${paperBg}, #F8FAFC)`
            : '#FFFFFF',
        }}
        initial={{ scale: 0.94, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.94, y: 20 }}
        transition={{ type: 'spring', damping: 26, stiffness: 300 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* If image card, render background image edge-to-edge */}
        {entry.image_url && (
          <img
            src={entry.image_url}
            alt="Fullscreen memory"
            className="absolute inset-0 w-full h-full object-cover"
          />
        )}

        {/* Top Dark Gradient Overlay for legible author header */}
        <div className="absolute top-0 inset-x-0 pt-4 pb-20 px-5 bg-gradient-to-b from-black/85 via-black/45 to-transparent pointer-events-none z-10" />

        {/* Top bar with Author Info */}
        <div className="relative z-20 flex items-center justify-between px-5 pt-4 pb-2">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <img
              src={avatarUrl}
              alt={entry.author?.name}
              className="w-10 h-10 rounded-full object-cover ring-2 ring-white shadow-md flex-shrink-0"
            />
            <div className="min-w-0 flex-1 font-sans">
              <p className="text-sm font-extrabold text-white leading-tight truncate drop-shadow-md">
                {entry.author?.name || 'Student'}
              </p>
              <p className="text-xs font-semibold text-white/90 mt-0.5 truncate drop-shadow-md">
                {collegeName(entry.author?.college)} • {relativeTime(entry.created_at)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {isOwner && (
              <button
                onClick={() => { onDelete(entry.id); onClose(); }}
                className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold text-rose-500 bg-black/40 backdrop-blur-md border border-rose-400/50 transition-all cursor-pointer hover:bg-rose-500 hover:text-white"
              >
                <Trash2 size={13} strokeWidth={1.8} /> Delete
              </button>
            )}
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-black/40 hover:bg-black/60 border border-white/25 flex items-center justify-center text-white transition-all shadow-sm cursor-pointer"
              aria-label="Close"
            >
              <X size={18} strokeWidth={2} />
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="relative z-10 flex-1 px-6 sm:px-8 py-8 flex flex-col justify-center items-center text-center overflow-y-auto">
          {entry.content?.trim() && (
            <div
              className={
                entry.image_url
                  ? 'bg-white/95 backdrop-blur-md rounded-2xl p-4 shadow-xl text-gray-900 border border-white/80 max-w-sm'
                  : 'w-full'
              }
            >
              <p
                className="leading-relaxed whitespace-pre-wrap break-words"
                style={{
                  fontFamily: fontStyle,
                  fontSize: Math.max(18, Math.round(21 * (entry.scale || 1))),
                  color: entry.image_url ? '#1F2937' : textColor,
                }}
              >
                {entry.content}
              </p>
            </div>
          )}
        </div>

        {/* Stacked TikTok/Reels Engagement Bar on Right Edge inside Fullscreen */}
        <div className="absolute bottom-6 right-4 z-20 flex flex-col items-center gap-3">
          {/* Like */}
          <div className="flex flex-col items-center">
            <motion.button
              onClick={() => onLike(entry.id)}
              whileTap={{ scale: 1.5, rotate: [0, -15, 15, -10, 0] }}
              whileHover={{ scale: 1.1 }}
              className={`w-11 h-11 rounded-full flex items-center justify-center transition-all shadow-lg backdrop-blur-md border cursor-pointer ${
                liked
                  ? 'bg-rose-500 border-rose-600 text-white'
                  : 'bg-black/50 border-white/30 text-white hover:bg-black/70'
              }`}
            >
              <Heart
                size={20}
                className={liked ? 'fill-white text-white' : 'text-white'}
                strokeWidth={2.2}
              />
            </motion.button>
            <span className="text-xs font-extrabold text-white drop-shadow-md mt-1">
              {entry.likes_count || 0}
            </span>
          </div>

          {/* Comment */}
          <div className="flex flex-col items-center">
            <motion.button
              onClick={() => onCommentClick(entry)}
              whileTap={{ scale: 1.3 }}
              whileHover={{ scale: 1.1 }}
              className="w-11 h-11 rounded-full bg-black/50 backdrop-blur-md border border-white/30 text-white hover:bg-black/70 flex items-center justify-center shadow-lg cursor-pointer"
            >
              <MessageCircle size={20} strokeWidth={2.2} />
            </motion.button>
            <span className="text-xs font-extrabold text-white drop-shadow-md mt-1">
              Comment
            </span>
          </div>

          {/* Gift / Reward */}
          <div className="flex flex-col items-center">
            <motion.button
              onClick={() => toast.success('Send reputation gift to support this author!')}
              whileTap={{ scale: 1.3 }}
              whileHover={{ scale: 1.1 }}
              className="w-11 h-11 rounded-full bg-black/50 backdrop-blur-md border border-white/30 text-amber-300 hover:bg-black/70 flex items-center justify-center shadow-lg cursor-pointer"
            >
              <Gift size={20} strokeWidth={2.2} />
            </motion.button>
            <span className="text-xs font-extrabold text-white drop-shadow-md mt-1">
              Gift
            </span>
          </div>

          {/* Share */}
          <div className="flex flex-col items-center">
            <motion.button
              onClick={() => onShareClick(entry)}
              whileTap={{ scale: 1.3 }}
              whileHover={{ scale: 1.1 }}
              className="w-11 h-11 rounded-full bg-black/50 backdrop-blur-md border border-white/30 text-white hover:bg-black/70 flex items-center justify-center shadow-lg cursor-pointer"
            >
              <Share2 size={19} strokeWidth={2.2} className="ml-0.5" />
            </motion.button>
            <span className="text-xs font-extrabold text-white drop-shadow-md mt-1">
              Share
            </span>
          </div>
        </div>

        {/* Bottom bar indicator */}
        <div className="absolute bottom-4 left-5 z-20 flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/50 backdrop-blur-md border border-white/25 text-white/95 font-bold text-xs pointer-events-none">
          <BookOpen size={13} className="text-amber-300" />
          <span>Campus Story PWA</span>
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
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [viewEntry, setViewEntry] = useState<DiaryEntry | null>(null);
  const [commentEntry, setCommentEntry] = useState<DiaryEntry | null>(null);
  const loadedRef = useRef(false);

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
    if (viewEntry?.id === id) setViewEntry(null);
    toast.success('Diary entry removed');
  };

  const handleShare = async (entry: DiaryEntry) => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Campus Diaries • ${entry.author?.name || 'Story'}`,
          text: entry.content || 'Check out this campus moment!',
          url: window.location.href,
        });
      } catch (err) {
        // User cancelled or share dismissed
      }
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success('Link copied! Share instantly to WhatsApp or other apps.');
    }
  };

  /* Empty state */
  if (!isLoading && entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 px-6 text-center max-w-md mx-auto">
        <div className="w-20 h-20 rounded-3xl bg-white border border-gray-200 flex items-center justify-center text-gray-700 mb-5 shadow-sm">
          <BookOpen size={36} strokeWidth={1.5} />
        </div>
        <h3 className="text-lg font-extrabold text-gray-900 font-sans tracking-tight mb-2">
          {filter === 'friends' ? 'No entries from campus friends yet' :
           filter === 'mine'    ? 'Your journal is currently empty' :
           'The campus journal is waiting for its first story'}
        </h3>
        <p className="text-sm font-normal text-gray-500 font-sans leading-relaxed">
          {filter === 'mine' 
            ? 'Tap the create button above or bottom right to share your thoughts with campus.' 
            : 'Be the pioneer to share a reflection, photo story, or memory for the entire campus.'}
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
              onClick={setViewEntry}
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
            onClose={() => setViewEntry(null)}
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

