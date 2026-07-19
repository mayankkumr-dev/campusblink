import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../store/authStore';
import { getUserDiaryEntries, deleteDiaryEntry, toggleDiaryLike } from '../../api/diary';
import { getAvatarDataUrl } from '../../lib/avatar';
import { DiaryFullscreen, isValidDiaryImage } from './DiaryMasonryGrid';

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
  image_url?: string | null;
  scale: number;
  likes_count?: number;
  liked_by?: string[];
  created_at: string;
  author?: {
    id: string;
    name: string;
    username: string;
    avatar_url?: string;
    college?: string;
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
  const [imageFailed, setImageFailed] = useState(false);
  const background = entry.gradient || entry.bg_color || '#ffffff';
  const fontSize = Math.max(11, Math.round(12 * (entry.scale || 1)));
  const hasImage = !imageFailed && isValidDiaryImage(entry.image_url);

  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.03, y: -2, boxShadow: '0 8px 24px rgba(0,0,0,0.12)' }}
      whileTap={{ scale: 0.97 }}
      initial={{ opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.88 }}
      transition={{ type: 'spring', damping: 22, stiffness: 300 }}
      className="aspect-square w-full rounded-xl overflow-hidden relative shadow-sm cursor-pointer border border-gray-100 flex flex-col justify-between select-none group"
      style={{ background: hasImage ? '#0F172A' : background }}
      aria-label={`View diary: ${entry.content.slice(0, 30)}`}
    >
      {hasImage ? (
        <img
          src={entry.image_url!}
          alt="Diary thumbnail"
          onError={() => setImageFailed(true)}
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
        />
      ) : null}

      <div className="relative z-10 inset-0 flex-1 flex items-center justify-center p-2.5 w-full">
        {entry.content?.trim() && (
          <p
            className={`text-center line-clamp-4 leading-snug break-words ${hasImage ? 'bg-white/95 backdrop-blur-md px-2 py-1.5 rounded-lg shadow-sm text-gray-900 font-semibold' : ''}`}
            style={{
              fontFamily: `'${entry.font_family}', serif`,
              fontSize,
              color: hasImage ? '#1F2937' : entry.text_color,
            }}
          >
            {entry.content}
          </p>
        )}
      </div>

      {/* Date chip */}
      <div className="relative z-20 w-full p-1.5 flex justify-end">
        <span
          className="text-[9px] font-extrabold px-1.5 py-0.5 rounded-full shadow-2xs"
          style={{
            background: hasImage ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.75)',
            backdropFilter: 'blur(4px)',
            color: hasImage ? '#FFFFFF' : entry.text_color,
            opacity: 0.9,
          }}
        >
          {formatRelativeTime(entry.created_at)}
        </span>
      </div>
    </motion.button>
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
          <DiaryFullscreen
            entry={viewEntry as any}
            currentUserId={currentProfile?.id}
            onClose={() => setViewEntry(null)}
            onDelete={handleDelete}
            onLike={async (id) => {
              if (!currentProfile?.id) return;
              await toggleDiaryLike(id, currentProfile.id);
            }}
            onCommentClick={() => toast('Head to Campus Diaries feed to comment & chat')}
            onShareClick={(entry) => {
              if (navigator.share) {
                navigator.share({
                  title: `Campus Diaries • ${entry.author?.name || 'Story'}`,
                  text: entry.content || 'Check out this campus moment!',
                  url: window.location.href,
                }).catch(() => {});
              } else {
                navigator.clipboard.writeText(window.location.href);
                toast.success('Story link copied!');
              }
            }}
          />
        )}
      </AnimatePresence>
    </>
  );
};
