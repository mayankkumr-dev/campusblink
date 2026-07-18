import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../store/authStore';
import { getUserDiaryEntries, deleteDiaryEntry } from '../../api/diary';
import { getAvatarDataUrl } from '../../lib/avatar';

/* ─── Helpers ───────────────────────────────────────────────────────── */
function formatRelativeTime(value: string) {
  const date = new Date(value);
  const diff = Date.now() - date.getTime();
  const min = 60 * 1000;
  const hour = 60 * min;
  const day = 24 * hour;
  if (diff < hour) return `${Math.max(1, Math.floor(diff / min))}m`;
  if (diff < day) return `${Math.max(1, Math.floor(diff / hour))}h`;
  if (diff < 7 * day) return `${Math.max(1, Math.floor(diff / day))}d`;
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

interface DiaryEntry {
  id: string;
  content: string;
  font_family: string;
  text_color: string;
  bg_color: string;
  gradient?: string | null;
  scale: number;
  created_at: string;
  author?: {
    id: string;
    name: string;
    username: string;
    avatar_url?: string;
  };
}

/* ─── Thumbnail card ────────────────────────────────────────────────── */
function DiaryThumbnail({
  entry,
  onClick,
}: {
  entry: DiaryEntry;
  onClick: () => void;
}) {
  const background = entry.gradient || entry.bg_color || '#ffffff';
  const fontSize = Math.max(10, Math.round(11 * (entry.scale || 1)));

  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.03, boxShadow: '0 8px 24px rgba(0,0,0,0.12)' }}
      whileTap={{ scale: 0.97 }}
      initial={{ opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.88 }}
      transition={{ type: 'spring', damping: 22, stiffness: 300 }}
      className="aspect-square w-full rounded-xl overflow-hidden relative shadow-sm"
      style={{ background }}
      aria-label={`View diary: ${entry.content.slice(0, 30)}`}
    >
      <div className="absolute inset-0 flex items-center justify-center p-2.5">
        <p
          className="text-center line-clamp-4 leading-snug break-words"
          style={{
            fontFamily: `'${entry.font_family}', serif`,
            fontSize,
            color: entry.text_color,
          }}
        >
          {entry.content}
        </p>
      </div>

      {/* Date chip */}
      <div
        className="absolute bottom-1.5 left-1.5 right-1.5 flex justify-end"
      >
        <span
          className="text-[9px] px-1.5 py-0.5 rounded-full"
          style={{
            background: 'rgba(255,255,255,0.65)',
            backdropFilter: 'blur(4px)',
            color: entry.text_color,
            opacity: 0.8,
            fontFamily: 'DM Sans, sans-serif',
          }}
        >
          {formatRelativeTime(entry.created_at)}
        </span>
      </div>
    </motion.button>
  );
}

/* ─── Fullscreen view modal ─────────────────────────────────────────── */
function DiaryViewModal({
  entry,
  isOwner,
  onClose,
  onDelete,
}: {
  entry: DiaryEntry | null;
  isOwner: boolean;
  onClose: () => void;
  onDelete: (id: string) => void;
}) {
  if (!entry) return null;
  const background = entry.gradient || entry.bg_color || '#ffffff';
  const avatarUrl =
    entry.author?.avatar_url ||
    getAvatarDataUrl({ name: entry.author?.name, seed: entry.author?.id || entry.id });

  const handleDelete = () => {
    if (!window.confirm('Delete this diary entry?')) return;
    onDelete(entry.id);
    onClose();
  };

  return (
    <motion.div
      className="fixed inset-0 z-50 flex flex-col"
      style={{ background }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
    >
      {/* Top bar */}
      <div
        className="flex items-center justify-between px-4 pb-3 pt-3"
        style={{ paddingTop: `calc(0.75rem + env(safe-area-inset-top, 0px))` }}
      >
        <button
          onClick={onClose}
          className="w-9 h-9 rounded-full flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.06)' }}
          aria-label="Close"
        >
          <X size={18} style={{ color: entry.text_color }} />
        </button>

        {isOwner && (
          <button
            onClick={handleDelete}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium text-rose-600"
            style={{ background: 'rgba(239,68,68,0.1)' }}
          >
            <Trash2 size={13} />
            Delete
          </button>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center px-8">
        <p
          className="text-center leading-relaxed"
          style={{
            fontFamily: `'${entry.font_family}', serif`,
            fontSize: Math.round(18 * (entry.scale || 1)),
            color: entry.text_color,
          }}
        >
          {entry.content}
        </p>
      </div>

      {/* Author */}
      <div
        className="px-6 pb-8 flex items-center gap-3"
        style={{ paddingBottom: `calc(2rem + env(safe-area-inset-bottom, 0px))` }}
      >
        <img
          src={avatarUrl}
          alt={entry.author?.name}
          className="w-9 h-9 rounded-full object-cover ring-2 ring-white shadow-sm"
        />
        <div>
          <p className="text-sm font-semibold" style={{ color: entry.text_color }}>
            {entry.author?.name}
          </p>
          <p className="text-xs opacity-60" style={{ color: entry.text_color }}>
            {formatRelativeTime(entry.created_at)}
          </p>
        </div>
      </div>
    </motion.div>
  );
}

/* ─── Main component ────────────────────────────────────────────────── */
interface DiaryProfileGridProps {
  /** The user whose diary entries to display */
  userId: string;
  /** Optionally pre-loaded entries (used when viewing own profile after creation) */
  preloadedEntries?: DiaryEntry[];
}

export const DiaryProfileGrid: React.FC<DiaryProfileGridProps> = ({
  userId,
  preloadedEntries,
}) => {
  const currentProfile = useAuthStore((s) => s.profile);
  const isOwner = currentProfile?.id === userId;

  const [entries, setEntries] = useState<DiaryEntry[]>(preloadedEntries || []);
  const [isLoading, setIsLoading] = useState(!preloadedEntries);
  const [viewEntry, setViewEntry] = useState<DiaryEntry | null>(null);
  const loadedRef = useRef(false);

  useEffect(() => {
    if (preloadedEntries) {
      setEntries(preloadedEntries);
      setIsLoading(false);
      return;
    }
    if (!userId || loadedRef.current) return;
    loadedRef.current = true;

    setIsLoading(true);
    getUserDiaryEntries(userId)
      .then(({ data, error }) => {
        if (error) {
          toast.error('Failed to load diary entries');
          return;
        }
        setEntries(data || []);
      })
      .finally(() => setIsLoading(false));
  }, [userId, preloadedEntries]);

  const handleDelete = async (id: string) => {
    if (!currentProfile?.id) return;
    const { error } = await deleteDiaryEntry(id, currentProfile.id);
    if (error) {
      toast.error(error.message || 'Failed to delete');
      return;
    }
    setEntries((prev) => prev.filter((e) => e.id !== id));
    toast.success('Entry deleted');
  };

  /* Skeleton */
  if (isLoading) {
    return (
      <div className="px-4 pt-4 grid grid-cols-3 gap-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="aspect-square w-full rounded-xl bg-gray-100 animate-pulse"
          />
        ))}
      </div>
    );
  }

  /* Empty state */
  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-6 text-center max-w-sm mx-auto select-none">
        {/* Soft-Tinted Vector Card Stack Illustration */}
        <div className="relative w-28 h-32 mb-6 flex items-center justify-center">
          <div className="absolute -inset-3 rounded-full bg-gradient-to-tr from-violet-500/10 via-pink-500/10 to-blue-500/10 blur-xl pointer-events-none" />
          
          {/* Rotated back card outline */}
          <div className="absolute w-20 h-24 rounded-xl bg-gradient-to-br from-violet-50 to-pink-50 border border-violet-200/80 shadow-xs -rotate-12 -translate-x-3 translate-y-1 p-2 opacity-85 flex flex-col justify-between">
            <div className="w-3.5 h-3.5 rounded-full bg-violet-200/80" />
            <div className="space-y-1">
              <div className="w-full h-1 bg-violet-200/80 rounded" />
              <div className="w-2/3 h-1 bg-violet-200/60 rounded" />
            </div>
          </div>

          {/* Rotated front/right card outline */}
          <div className="absolute w-20 h-24 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200/80 shadow-xs rotate-12 translate-x-3 translate-y-1 p-2 opacity-85 flex flex-col justify-between">
            <div className="w-3.5 h-3.5 rounded-full bg-blue-200/80" />
            <div className="space-y-1">
              <div className="w-full h-1 bg-blue-200/80 rounded" />
              <div className="w-2/3 h-1 bg-blue-200/60 rounded" />
            </div>
          </div>

          {/* Center main card illustration */}
          <div className="relative z-10 w-22 h-26 rounded-xl bg-white border border-gray-200 shadow-md flex flex-col justify-between p-2.5 transform hover:scale-105 transition-transform duration-300">
            <div className="flex items-center gap-1.5">
              <div className="w-5 h-5 rounded-full bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center text-white shadow-2xs">
                <span className="text-[10px]">✨</span>
              </div>
              <div className="space-y-0.5 flex-1">
                <div className="w-10 h-1.5 bg-gray-200 rounded" />
                <div className="w-6 h-1 bg-gray-100 rounded" />
              </div>
            </div>
            <div className="my-auto space-y-1 flex flex-col items-center">
              <div className="w-4/5 h-1.5 bg-gray-100 rounded" />
              <div className="w-full h-1.5 bg-gray-100 rounded" />
              <div className="w-3/5 h-1.5 bg-gray-100 rounded" />
            </div>
            <div className="flex justify-end pt-1">
              <div className="w-4 h-4 rounded-full bg-rose-50 flex items-center justify-center text-[8px] text-rose-500">
                ❤️
              </div>
            </div>
          </div>
        </div>

        <h3 className="font-syne text-base font-bold text-gray-900 tracking-tight mb-1.5">
          {isOwner ? 'Your campus journal is empty' : 'No diary stories yet'}
        </h3>
        <p className="text-xs font-medium text-gray-500 leading-relaxed max-w-[240px]">
          {isOwner
            ? 'Capture your college journey! Head over to Campus Diaries to publish your first moment.'
            : 'This student hasn\'t shared any campus stories or journal moments yet.'}
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="px-4 pt-4 pb-6 grid grid-cols-3 gap-2">
        <AnimatePresence>
          {entries.map((entry) => (
            <div key={entry.id}>
              <DiaryThumbnail
                entry={entry}
                onClick={() => setViewEntry(entry)}
              />
            </div>
          ))}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {viewEntry && (
          <DiaryViewModal
            entry={viewEntry}
            isOwner={isOwner}
            onClose={() => setViewEntry(null)}
            onDelete={handleDelete}
          />
        )}
      </AnimatePresence>
    </>
  );
};
