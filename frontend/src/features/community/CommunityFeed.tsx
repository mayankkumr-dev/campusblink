/**
 * CommunityFeed.tsx — Campus Diaries Hub
 *
 * Ultra-premium, light-mode only interface tailored for the MAIT ecosystem.
 * Features a sleek sticky glassmorphism header, segmented scrollable navigation pills
 * with animated active layout shift, masonry/vertical stack feed, and a prominent Feather Pen FAB.
 */

import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { BookOpen, Flame, Sparkles, Users, User, Feather } from 'lucide-react';
import { useNavigate } from 'react-router';
import { useAuthStore } from '../../store/authStore';
import { getFollowingIds } from '../../api/follow';
import { getRecentFriendWriters } from '../../api/diary';
import { useFeatureAccess } from '../../hooks/useFeatureAccess';
import { AccessDenied } from '../../shared/components/AccessDenied';
import { getAvatarDataUrl } from '../../lib/avatar';
import { PostSkeleton } from '../../app/components/ui/Skeletons';
import { DiaryCreatorModal } from './DiaryCreatorModal';
import { DiaryMasonryGrid } from './DiaryMasonryGrid';
import type { DiaryEntry } from './DiaryMasonryGrid';

/* ─── Feed filter tabs ───────────────────────────────────────────── */
type DiaryFilter = 'popular' | 'new' | 'friends' | 'mine';

const FILTER_TABS: { label: string; value: DiaryFilter; icon: React.ReactNode; activeColor: string }[] = [
  { label: 'Popular', value: 'popular', icon: <Flame size={15} strokeWidth={2} />,    activeColor: 'text-amber-500'   },
  { label: 'New',     value: 'new',     icon: <Sparkles size={15} strokeWidth={2} />, activeColor: 'text-indigo-500'  },
  { label: 'Friends', value: 'friends', icon: <Users size={15} strokeWidth={2} />,    activeColor: 'text-emerald-500' },
  { label: 'Mine',    value: 'mine',    icon: <User size={15} strokeWidth={2} />,     activeColor: 'text-rose-500'    },
];

/* ─── Friends row ────────────────────────────────────────────────── */
interface FriendWriter {
  author_id: string;
  author: { id: string; name: string; avatar_url?: string };
}

function FriendsRow({ writers }: { writers: FriendWriter[] }) {
  const navigate = useNavigate();
  if (writers.length === 0) return null;

  return (
    <div className="mx-4 mb-6 rounded-2xl border border-stone-200/70 bg-[#FAF9F6] p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-bold text-stone-600 uppercase tracking-wider font-sans flex items-center gap-1.5">
          <span>👥</span>
          <span>Campus Friends Who Wrote Recently</span>
        </p>
        <span className="text-[11px] font-semibold text-stone-400 bg-stone-200/50 px-2 py-0.5 rounded-full">
          {writers.length} {writers.length === 1 ? 'friend' : 'friends'}
        </span>
      </div>
      <div className="flex gap-4 overflow-x-auto scrollbar-none pb-1 pt-0.5">
        {writers.map((w) => {
          const avatar =
            w.author?.avatar_url ||
            getAvatarDataUrl({ name: w.author?.name, seed: w.author?.id });
          return (
            <button
              key={w.author_id}
              onClick={() => navigate(`/student/profile/${w.author_id}`)}
              className="group flex flex-col items-center gap-1.5 flex-shrink-0 transition-transform hover:-translate-y-0.5"
            >
              <div className="w-12 h-12 rounded-full overflow-hidden ring-2 ring-amber-400/60 group-hover:ring-amber-500 shadow-sm transition-all p-0.5 bg-white">
                <img
                  src={avatar}
                  alt={w.author?.name}
                  className="w-full h-full object-cover rounded-full"
                />
              </div>
              <span className="text-xs font-bold text-stone-700 max-w-[56px] truncate font-sans group-hover:text-stone-900">
                {w.author?.name?.split(' ')[0]}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Main component ─────────────────────────────────────────────── */
export const CommunityFeed: React.FC = () => {
  const profile = useAuthStore((s) => s.profile);
  const { hasAccess: hasCommunityAccess, isChecking: checkingCommunityAccess } =
    useFeatureAccess('community_access');

  const [activeFilter, setActiveFilter] = useState<DiaryFilter>('new');
  const [isDiaryCreatorOpen, setIsDiaryCreatorOpen] = useState(false);
  const [newDiaryEntry, setNewDiaryEntry] = useState<DiaryEntry | null>(null);
  const [followingIds, setFollowingIds] = useState<string[]>([]);
  const [friendWriters, setFriendWriters] = useState<FriendWriter[]>([]);

  // Load following list
  useEffect(() => {
    if (!profile?.id) return;
    let mounted = true;
    getFollowingIds(profile.id).then(({ data }) => {
      if (!mounted) return;
      const ids = data || [];
      setFollowingIds(ids);
      if (ids.length > 0) {
        getRecentFriendWriters(ids).then(({ data: writers }) => {
          if (mounted) setFriendWriters((writers as FriendWriter[]) || []);
        });
      }
    });
    return () => { mounted = false; };
  }, [profile?.id]);

  if (checkingCommunityAccess) {
    return (
      <div className="min-h-screen bg-white px-4 py-8">
        <div className="mx-auto w-full max-w-[680px] space-y-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <PostSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (!hasCommunityAccess) {
    return <AccessDenied feature="Community" />;
  }

  return (
    <div className="w-full min-h-screen bg-white text-stone-900 font-sans select-none">
      {/* ── Sleek Glassmorphism Header ─────────────────────────── */}
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-stone-200/60 shadow-[0_2px_14px_rgba(0,0,0,0.025)] transition-all">
        {/* Title row */}
        <div className="max-w-7xl mx-auto flex items-center justify-between px-4 pt-4 pb-2">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-500/15 via-orange-500/15 to-rose-500/15 border border-amber-200/70 flex items-center justify-center shadow-sm">
              <Feather size={20} className="text-amber-700" strokeWidth={1.8} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl md:text-2xl font-extrabold tracking-tight text-stone-900 leading-none">
                  Campus Diaries
                </h1>
                <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-amber-100/80 text-amber-800 border border-amber-200/60">
                  MAIT Ecosystem
                </span>
              </div>
              <p className="text-xs md:text-sm text-stone-500 font-medium mt-1">
                Reflections, stories & memories from across our campus
              </p>
            </div>
          </div>
        </div>

        {/* Navigation Tabs (Scrollable Segmented Pill) */}
        <div className="max-w-7xl mx-auto px-4 pb-3 pt-1">
          <div className="flex items-center gap-1.5 p-1.5 bg-stone-100/80 border border-stone-200/60 rounded-full overflow-x-auto scrollbar-none w-full md:w-fit">
            {FILTER_TABS.map((tab) => {
              const isActive = activeFilter === tab.value;
              return (
                <button
                  key={tab.value}
                  onClick={() => setActiveFilter(tab.value)}
                  className={`relative px-4.5 py-2 md:px-5 md:py-2 rounded-full text-xs md:text-sm font-bold transition-all duration-200 flex items-center gap-2 whitespace-nowrap flex-shrink-0 cursor-pointer ${
                    isActive ? 'text-stone-900' : 'text-stone-500 hover:text-stone-700'
                  }`}
                  aria-pressed={isActive}
                >
                  {isActive && (
                    <motion.div
                      layoutId="diaryFilterIndicator"
                      className="absolute inset-0 bg-white rounded-full shadow-[0_2px_10px_rgba(0,0,0,0.065)] border border-stone-200/50"
                      transition={{ type: 'spring', damping: 25, stiffness: 320 }}
                    />
                  )}
                  <span className={`relative z-10 transition-colors ${isActive ? tab.activeColor : 'text-stone-400'}`}>
                    {tab.icon}
                  </span>
                  <span className="relative z-10 tracking-tight">
                    {tab.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* ── Feed Content Body ───────────────────────────────────── */}
      <main className="max-w-7xl mx-auto pt-5 pb-32">
        {/* Friends who wrote recently (if Friends tab is active) */}
        {activeFilter === 'friends' && <FriendsRow writers={friendWriters} />}

        {/* Masonry / Vertical Stack Feed Grid */}
        <div className="px-4">
          <DiaryMasonryGrid
            filter={activeFilter}
            followingIds={followingIds}
            newEntry={newDiaryEntry}
          />
        </div>
      </main>

      {/* ── Prominent Floating Action Button (FAB) ──────────────── */}
      <motion.button
        onClick={() => setIsDiaryCreatorOpen(true)}
        whileHover={{ scale: 1.05, y: -2 }}
        whileTap={{ scale: 0.95 }}
        className="group fixed right-5 md:right-8 bottom-24 md:bottom-8 z-40 px-6 py-4 rounded-full flex items-center gap-3 transition-all duration-300 select-none cursor-pointer"
        style={{
          background: '#18181B', // sleek dark stone-900 button for contrast in ultra-premium light mode
          boxShadow: '0 14px 38px rgba(24, 24, 27, 0.28), 0 4px 12px rgba(0, 0, 0, 0.15)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
        }}
        aria-label="Write a new diary entry"
      >
        <div className="w-7 h-7 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-400 group-hover:rotate-12 transition-transform">
          <Feather size={17} strokeWidth={2} />
        </div>
        <span className="text-white text-sm font-extrabold tracking-wide pr-0.5">
          Write Entry
        </span>
      </motion.button>

      {/* ── Diary creator modal ──────────────────────────────────── */}
      <DiaryCreatorModal
        isOpen={isDiaryCreatorOpen}
        onClose={() => setIsDiaryCreatorOpen(false)}
        onCreated={(entry) => {
          setNewDiaryEntry(entry as DiaryEntry);
          setActiveFilter('mine');
          setTimeout(() => setNewDiaryEntry(null), 800);
        }}
      />
    </div>
  );
};
