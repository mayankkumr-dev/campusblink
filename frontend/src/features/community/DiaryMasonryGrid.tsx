/**
 * DiaryMasonryGrid.tsx
 *
 * Ultra-premium Campus Diaries Masonry Grid & Vertical Stack tailored for the MAIT ecosystem.
 * Enforces a strict, high-end light-mode aesthetic simulating physical journal pages
 * with faint horizontal ruled lines, elegant handwritten fonts, and micro-interactions.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Heart, Trash2, X, Sparkles, Calendar, BookOpen, Share2 } from 'lucide-react';
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

/* ─── Helpers ────────────────────────────────────────────────────── */
function relativeTime(value: string) {
  const diff = Date.now() - new Date(value).getTime();
  const min = 60 * 1000, hour = 60 * min, day = 24 * hour;
  if (diff < min)   return 'Just now';
  if (diff < hour)  return `${Math.max(1, Math.floor(diff / min))}m ago`;
  if (diff < day)   return `${Math.max(1, Math.floor(diff / hour))}h ago`;
  if (diff < 7*day) return `${Math.max(1, Math.floor(diff / day))}d ago`;
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
    case 'DM Sans':            return `'Plus Jakarta Sans', sans-serif`;
    default:                   return `'Caveat', cursive`;
  }
}

/* ─── Skeleton card ──────────────────────────────────────────────── */
function DiaryCardSkeleton({ tall }: { tall?: boolean }) {
  return (
    <div
      className="w-full rounded-[24px] border border-stone-200/60 bg-[#FAF9F6] p-6 shadow-sm animate-pulse flex flex-col justify-between"
      style={{ minHeight: tall ? 260 : 190 }}
    >
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-stone-200/80" />
        <div className="space-y-2 flex-1">
          <div className="h-3.5 w-28 bg-stone-200/80 rounded" />
          <div className="h-2.5 w-20 bg-stone-100 rounded" />
        </div>
      </div>
      <div className="space-y-3 my-4">
        <div className="h-3 bg-stone-200/60 rounded w-full" />
        <div className="h-3 bg-stone-200/60 rounded w-5/6" />
        {tall && <div className="h-3 bg-stone-200/60 rounded w-4/6" />}
      </div>
      <div className="pt-3 border-t border-stone-100 flex justify-end">
        <div className="h-6 w-12 bg-stone-200/70 rounded-full" />
      </div>
    </div>
  );
}

/* ─── Single diary card (Physical Journal Page) ──────────────────── */
function DiaryCard({
  entry,
  currentUserId,
  onLike,
  onDelete,
  onClick,
}: {
  entry: DiaryEntry;
  currentUserId?: string;
  onLike: (id: string) => void | Promise<void>;
  onDelete: (id: string) => void | Promise<void>;
  onClick: (entry: DiaryEntry) => void;
}) {
  const isOwner = currentUserId && entry.author?.id === currentUserId;
  const liked = currentUserId ? (entry.liked_by || []).includes(currentUserId) : false;

  const avatarUrl =
    entry.author?.avatar_url ||
    getAvatarDataUrl({ name: entry.author?.name, seed: entry.author?.id || entry.id });

  // Use entry bg if it's a warm paper tint, or default to crisp paper cream
  const paperBg = entry.bg_color && entry.bg_color !== '#0D1B2A' ? entry.bg_color : '#FFFBF2';
  const textColor = entry.text_color && entry.text_color !== '#ffffff' ? entry.text_color : '#2D1B10';
  const fontStyle = getHandwritingFont(entry.font_family);

  return (
    <motion.article
      onClick={() => onClick(entry)}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      whileHover={{ 
        y: -4, 
        boxShadow: '0 18px 42px rgba(0, 0, 0, 0.08)',
        borderColor: 'rgba(168, 162, 158, 0.7)'
      }}
      transition={{ type: 'spring', damping: 24, stiffness: 280 }}
      className="group w-full rounded-[24px] border border-stone-200/70 cursor-pointer relative overflow-hidden flex flex-col justify-between transition-colors duration-300 select-none"
      style={{
        background: paperBg,
        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.035)',
      }}
    >
      {/* Top subtle paper texture bar / binder accent */}
      <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-stone-300/40 via-amber-300/30 to-stone-300/40 opacity-70" />

      {/* Author Header — Clean at Top Left */}
      <div className="flex items-center justify-between px-5 pt-5 pb-3">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="relative flex-shrink-0">
            <img
              src={avatarUrl}
              alt={entry.author?.name || 'Author'}
              className="w-10 h-10 rounded-full object-cover ring-2 ring-white shadow-sm border border-stone-200/80 transition-transform group-hover:scale-105"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = getAvatarDataUrl({
                  name: entry.author?.name,
                  seed: entry.author?.id || entry.id,
                });
              }}
            />
            <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 ring-2 ring-white" title="MAIT Student" />
          </div>
          <div className="min-w-0 flex-1 font-sans">
            <p className="text-sm font-extrabold text-stone-900 tracking-tight leading-snug truncate">
              {entry.author?.name || 'Campus Student'}
            </p>
            <div className="flex items-center gap-1.5 text-[11px] text-stone-400 font-medium tracking-normal truncate mt-0.5">
              <span className="text-stone-500 font-semibold truncate">{collegeName(entry.author?.college)}</span>
              <span>•</span>
              <span className="flex-shrink-0">{relativeTime(entry.created_at)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Content Area with Faint Horizontal Ruled Lines & Attached Photo */}
      <div 
        className="relative px-6 py-3 flex-1 flex flex-col justify-between"
        style={{
          backgroundImage: 'repeating-linear-gradient(transparent, transparent 29px, rgba(168, 162, 158, 0.18) 30px)',
        }}
      >
        {/* Subtle left red margin indicator line */}
        <div className="absolute top-0 bottom-0 left-4 w-[1px] bg-rose-300/35 pointer-events-none" />
        
        <p
          className="leading-[30px] pt-[2px] line-clamp-7 break-words transition-all relative z-10"
          style={{
            fontFamily: fontStyle,
            fontSize: Math.max(17, Math.round(19 * (entry.scale || 1))),
            color: textColor,
          }}
        >
          {entry.content}
        </p>

        {entry.image_url && (
          <div className="mt-3.5 mb-1 relative z-10 rounded-2xl overflow-hidden border border-stone-200/80 shadow-[0_6px_20px_rgba(0,0,0,0.065)] bg-white/70">
            <img
              src={entry.image_url}
              alt="Attached memory"
              className="w-full max-h-52 object-cover transition-transform duration-500 group-hover:scale-102"
              loading="lazy"
            />
          </div>
        )}
      </div>

      {/* Bottom Actions Bar — Delete & Heart in corners */}
      <div 
        className="flex items-center justify-between px-5 py-3 mt-3 border-t border-stone-200/50 bg-stone-50/40 backdrop-blur-[2px] transition-colors group-hover:bg-stone-100/40"
      >
        {/* Left: Subtle Diary Page icon (Delete button moved inside fullscreen modal on card click) */}
        <div>
          <div className="flex items-center gap-1 text-[11px] font-medium text-stone-400 font-sans px-1">
            <BookOpen size={13} strokeWidth={1.5} className="text-amber-600/70" />
            <span>Journal Page</span>
          </div>
        </div>

        {/* Right: Heart (like) counter with pop animation & thin line SVG */}
        <motion.button
          onClick={(e) => {
            e.stopPropagation();
            onLike(entry.id);
          }}
          whileTap={{ scale: 1.35 }}
          whileHover={{ scale: 1.06 }}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full font-sans transition-all duration-200 border ${
            liked 
              ? 'bg-rose-50/90 border-rose-200 text-[#E11D48] shadow-sm' 
              : 'bg-white/80 border-stone-200/70 text-stone-600 hover:border-rose-300 hover:text-rose-500 hover:bg-rose-50/40 shadow-[0_2px_8px_rgba(0,0,0,0.02)]'
          }`}
          aria-label={liked ? 'Unlike' : 'Like'}
        >
          <Heart
            size={16}
            fill={liked ? '#E11D48' : 'none'}
            stroke={liked ? '#E11D48' : 'currentColor'}
            strokeWidth={1.5}
            className="transition-colors"
          />
          <span className="text-xs font-extrabold tracking-tight">
            {entry.likes_count || 0}
          </span>
        </motion.button>
      </div>
    </motion.article>
  );
}

/* ─── Fullscreen Diary View (Pure Light Mode Physical Page) ──────── */
function DiaryFullscreen({
  entry,
  currentUserId,
  onClose,
  onDelete,
  onLike,
}: {
  entry: DiaryEntry;
  currentUserId?: string;
  onClose: () => void;
  onDelete: (id: string) => void | Promise<void>;
  onLike: (id: string) => void | Promise<void>;
}) {
  const isOwner = currentUserId && (entry.author?.id === currentUserId || (entry as any).author_id === currentUserId);
  const liked = currentUserId ? (entry.liked_by || []).includes(currentUserId) : false;
  const paperBg = entry.bg_color && entry.bg_color !== '#0D1B2A' ? entry.bg_color : '#FFFBF2';
  const textColor = entry.text_color && entry.text_color !== '#ffffff' ? entry.text_color : '#2D1B10';
  const fontStyle = getHandwritingFont(entry.font_family);

  const avatarUrl =
    entry.author?.avatar_url ||
    getAvatarDataUrl({ name: entry.author?.name, seed: entry.author?.id });

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6 overflow-y-auto"
      style={{ background: 'rgba(26, 26, 46, 0.35)', backdropFilter: 'blur(8px)' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      onClick={onClose}
    >
      <motion.div
        className="w-full max-w-2xl rounded-[32px] border border-stone-200 shadow-[0_25px_80px_rgba(0,0,0,0.14)] overflow-hidden flex flex-col relative my-auto select-none"
        style={{ background: paperBg }}
        initial={{ scale: 0.94, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.94, y: 20 }}
        transition={{ type: 'spring', damping: 26, stiffness: 300 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200/50 bg-stone-50/50">
          <div className="flex items-center gap-2">
            <BookOpen size={16} className="text-amber-700" />
            <span className="text-xs font-bold uppercase tracking-wider text-stone-500 font-sans">
              MAIT Journal Entry
            </span>
          </div>
          <div className="flex items-center gap-2">
            {isOwner && (
              <button
                onClick={() => { onDelete(entry.id); onClose(); }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100/80 border border-rose-200/60 font-sans transition-all cursor-pointer"
              >
                <Trash2 size={13} strokeWidth={1.5} /> Delete
              </button>
            )}
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-white hover:bg-stone-100 border border-stone-200 flex items-center justify-center text-stone-600 transition-all shadow-sm cursor-pointer"
              aria-label="Close"
            >
              <X size={18} strokeWidth={1.5} />
            </button>
          </div>
        </div>

        {/* Author info */}
        <div className="flex items-center gap-4 px-8 pt-8 pb-4">
          <img
            src={avatarUrl}
            alt={entry.author?.name}
            className="w-12 h-12 rounded-full object-cover ring-4 ring-white shadow-md border border-stone-200/60"
          />
          <div className="font-sans">
            <p className="text-base font-extrabold text-stone-900 leading-tight">
              {entry.author?.name}
            </p>
            <p className="text-xs font-medium text-stone-500 mt-0.5">
              {collegeName(entry.author?.college)} • {relativeTime(entry.created_at)}
            </p>
          </div>
        </div>

        {/* Paper content area with ruled lines & attached photo */}
        <div 
          className="px-8 pb-10 flex-1 relative min-h-[220px] flex flex-col justify-between"
          style={{
            backgroundImage: 'repeating-linear-gradient(transparent, transparent 33px, rgba(168, 162, 158, 0.2) 34px)',
          }}
        >
          <div className="absolute top-0 bottom-0 left-5 w-[1px] bg-rose-300/40 pointer-events-none" />
          
          <p
            className="leading-[34px] pt-[2px] whitespace-pre-wrap break-words pl-3 relative z-10"
            style={{
              fontFamily: fontStyle,
              fontSize: Math.max(20, Math.round(22 * (entry.scale || 1))),
              color: textColor,
            }}
          >
            {entry.content}
          </p>

          {entry.image_url && (
            <div className="mt-6 mb-2 ml-3 relative z-10 rounded-2xl overflow-hidden border border-stone-200/80 shadow-[0_8px_28px_rgba(0,0,0,0.07)] bg-white/80 max-h-96 flex items-center justify-center">
              <img
                src={entry.image_url}
                alt="Attached memory fullscreen"
                className="w-full max-h-96 object-cover"
              />
            </div>
          )}
        </div>

        {/* Bottom actions bar */}
        <div className="px-8 py-4 bg-stone-50/80 border-t border-stone-200/60 flex items-center justify-between font-sans">
          <div className="flex items-center gap-3">
            <span className="text-xs font-medium text-stone-400">
              Recorded in Campus Diaries
            </span>
            {isOwner && (
              <button
                onClick={() => { onDelete(entry.id); onClose(); }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-all cursor-pointer shadow-sm"
              >
                <Trash2 size={13} /> Delete Entry
              </button>
            )}
          </div>
          <motion.button
            onClick={() => onLike(entry.id)}
            whileTap={{ scale: 1.35 }}
            whileHover={{ scale: 1.05 }}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-full font-bold text-sm transition-all border cursor-pointer ${
              liked 
                ? 'bg-rose-50 border-rose-200 text-[#E11D48] shadow-sm' 
                : 'bg-white border-stone-200 text-stone-600 hover:border-rose-300 hover:text-rose-500 shadow-sm'
            }`}
          >
            <Heart
              size={18}
              fill={liked ? '#E11D48' : 'none'}
              stroke={liked ? '#E11D48' : 'currentColor'}
              strokeWidth={1.5}
            />
            <span>{entry.likes_count || 0} Likes</span>
          </motion.button>
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
    if (!window.confirm('Remove this journal entry from Campus Diaries?')) return;
    const { error } = await deleteDiaryEntry(id, profile.id);
    if (error) { toast.error(error.message || 'Failed to delete'); return; }
    setEntries((prev) => prev.filter((e) => e.id !== id));
    toast.success('Diary entry removed');
  };

  /* Empty state */
  if (!isLoading && entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 px-6 text-center max-w-md mx-auto">
        <div className="w-20 h-20 rounded-3xl bg-amber-50 border border-amber-200/60 flex items-center justify-center text-amber-600 mb-5 shadow-sm">
          <BookOpen size={36} strokeWidth={1.5} />
        </div>
        <h3 className="text-lg font-extrabold text-stone-900 font-sans tracking-tight mb-2">
          {filter === 'friends' ? 'No entries from campus friends yet' :
           filter === 'mine'    ? 'Your journal is currently empty' :
           'The campus journal is waiting for its first story'}
        </h3>
        <p className="text-sm font-normal text-stone-500 font-sans leading-relaxed">
          {filter === 'mine' 
            ? 'Tap the feather pen button right below to write your thoughts and immortalize them on MAIT campus.' 
            : 'Be the pioneer to write a reflection, experience, or memory for the entire MAIT ecosystem.'}
        </p>
      </div>
    );
  }

  /* Responsive column breakdown: 1 column on mobile, 2 on md, 3 on lg */
  const col1: DiaryEntry[] = [];
  const col2: DiaryEntry[] = [];
  const col3: DiaryEntry[] = [];
  
  entries.forEach((entry, i) => {
    if (i % 3 === 0) col1.push(entry);
    else if (i % 3 === 1) col2.push(entry);
    else col3.push(entry);
  });

  // Also 2-col distribution for tablet md view
  const leftMd: DiaryEntry[] = [];
  const rightMd: DiaryEntry[] = [];
  entries.forEach((entry, i) => (i % 2 === 0 ? leftMd : rightMd).push(entry));

  return (
    <div className="w-full">
      {/* ── Mobile & Small Screen Vertical Stack (< md) ─────────────── */}
      <div className="flex flex-col gap-5 px-1 md:hidden">
        {isLoading && entries.length === 0 ? (
          [0, 1, 2].map((i) => <DiaryCardSkeleton key={i} tall={i === 1} />)
        ) : (
          entries.map((entry) => (
            <DiaryCard
              key={entry.id}
              entry={entry}
              currentUserId={profile?.id}
              onLike={handleLike}
              onDelete={handleDelete}
              onClick={setViewEntry}
            />
          ))
        )}
      </div>

      {/* ── Tablet 2-Column Masonry (md:flex lg:hidden) ──────────────── */}
      <div className="hidden md:flex lg:hidden gap-6 items-start">
        <div className="flex-1 flex flex-col gap-6">
          {isLoading && leftMd.length === 0 ? (
            [0, 2].map((i) => <DiaryCardSkeleton key={i} tall={i === 0} />)
          ) : (
            leftMd.map((entry) => (
              <DiaryCard
                key={entry.id}
                entry={entry}
                currentUserId={profile?.id}
                onLike={handleLike}
                onDelete={handleDelete}
                onClick={setViewEntry}
              />
            ))
          )}
        </div>
        <div className="flex-1 flex flex-col gap-6 mt-6">
          {isLoading && rightMd.length === 0 ? (
            [1, 3].map((i) => <DiaryCardSkeleton key={i} tall={i === 1} />)
          ) : (
            rightMd.map((entry) => (
              <DiaryCard
                key={entry.id}
                entry={entry}
                currentUserId={profile?.id}
                onLike={handleLike}
                onDelete={handleDelete}
                onClick={setViewEntry}
              />
            ))
          )}
        </div>
      </div>

      {/* ── Desktop 3-Column Masonry Grid (lg:flex) ──────────────────── */}
      <div className="hidden lg:flex gap-6 items-start">
        <div className="flex-1 flex flex-col gap-6">
          {isLoading && col1.length === 0 ? (
            <DiaryCardSkeleton tall />
          ) : (
            col1.map((entry) => (
              <DiaryCard
                key={entry.id}
                entry={entry}
                currentUserId={profile?.id}
                onLike={handleLike}
                onDelete={handleDelete}
                onClick={setViewEntry}
              />
            ))
          )}
        </div>
        <div className="flex-1 flex flex-col gap-6 mt-6">
          {isLoading && col2.length === 0 ? (
            <DiaryCardSkeleton />
          ) : (
            col2.map((entry) => (
              <DiaryCard
                key={entry.id}
                entry={entry}
                currentUserId={profile?.id}
                onLike={handleLike}
                onDelete={handleDelete}
                onClick={setViewEntry}
              />
            ))
          )}
        </div>
        <div className="flex-1 flex flex-col gap-6 mt-12">
          {isLoading && col3.length === 0 ? (
            <DiaryCardSkeleton tall />
          ) : (
            col3.map((entry) => (
              <DiaryCard
                key={entry.id}
                entry={entry}
                currentUserId={profile?.id}
                onLike={handleLike}
                onDelete={handleDelete}
                onClick={setViewEntry}
              />
            ))
          )}
        </div>
      </div>

      {/* Load More Button */}
      {!isLoading && hasMore && (
        <div className="mt-10 flex justify-center">
          <button
            onClick={() => { const next = page + 1; setPage(next); load(next); }}
            className="px-8 py-3.5 text-sm font-bold text-stone-700 bg-white hover:bg-stone-50 border border-stone-200 rounded-full shadow-[0_4px_16px_rgba(0,0,0,0.04)] hover:shadow-md transition-all duration-200 font-sans flex items-center gap-2"
          >
            <span>Load more entries</span>
          </button>
        </div>
      )}

      {/* Loading Spinner */}
      {isLoading && entries.length > 0 && (
        <div className="flex justify-center mt-8">
          <div className="w-6 h-6 border-2 border-stone-200 border-t-amber-600 rounded-full animate-spin" />
        </div>
      )}

      {/* Fullscreen Modal */}
      <AnimatePresence>
        {viewEntry && (
          <DiaryFullscreen
            entry={viewEntry}
            currentUserId={profile?.id}
            onClose={() => setViewEntry(null)}
            onDelete={handleDelete}
            onLike={handleLike}
          />
        )}
      </AnimatePresence>
    </div>
  );
};
