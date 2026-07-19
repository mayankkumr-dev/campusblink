/**
 * CommunityFeed.tsx — Campus Diaries Hub
 *
 * Strict, premium light-mode-only interface tailored for the MAIT ecosystem.
 * Features pure whites, breathable whitespace, soft off-white backgrounds (bg-gray-50),
 * ultra-soft diffused drop-shadows, horizontally scrollable floating pill filters,
 * and a responsive Pinterest-meets-Instagram-Stories masonry layout.
 */

import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Flame, Sparkles, Users, User, Feather, BookOpen } from 'lucide-react';
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

const FILTER_TABS: { label: string; value: DiaryFilter; icon: React.ReactNode }[] = [
  { label: 'Popular', value: 'popular', icon: <Flame size={15} strokeWidth={2.2} /> },
  { label: 'New',     value: 'new',     icon: <Sparkles size={15} strokeWidth={2.2} /> },
  { label: 'Friends', value: 'friends', icon: <Users size={15} strokeWidth={2.2} /> },
  { label: 'Mine',    value: 'mine',    icon: <User size={15} strokeWidth={2.2} /> },
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
    <div className="mx-3 sm:mx-6 mb-6 rounded-2xl border border-gray-200/70 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-bold text-gray-700 uppercase tracking-wider font-sans flex items-center gap-1.5">
          <span>👥</span>
          <span>Campus Friends Who Wrote Recently</span>
        </p>
        <span className="text-[11px] font-semibold text-gray-500 bg-gray-100 px-2.5 py-0.5 rounded-full">
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
              className="group flex flex-col items-center gap-1.5 flex-shrink-0 transition-transform hover:-translate-y-0.5 cursor-pointer"
            >
              <div className="w-12 h-12 rounded-full overflow-hidden ring-2 ring-gray-200 group-hover:ring-gray-400 shadow-sm transition-all p-0.5 bg-white">
                <img
                  src={avatar}
                  alt={w.author?.name}
                  className="w-full h-full object-cover rounded-full"
                />
              </div>
              <span className="text-xs font-bold text-gray-700 max-w-[56px] truncate font-sans group-hover:text-gray-900">
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
      <div className="min-h-screen bg-gray-50 px-4 py-8">
        <div className="mx-auto w-full max-w-5xl space-y-6">
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
    <div className="w-full min-h-screen bg-gray-50 text-gray-900 font-sans select-none">
      {/* ── Sleek, Sticky Top Header Ribbon ──────────────────────── */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-gray-200/80 shadow-xs pt-[env(safe-area-inset-top,0px)] transition-all">
        {/* Title row */}
        <div className="max-w-7xl mx-auto flex items-center justify-between px-4 sm:px-6 pt-4 pb-2.5 gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-gray-100 border border-gray-200/80 flex items-center justify-center shadow-2xs shrink-0">
              <BookOpen size={19} className="text-gray-800" strokeWidth={2} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-xl md:text-2xl font-extrabold tracking-tight text-gray-900 leading-none truncate font-syne">
                  Campus Diaries
                </h1>
                <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-gray-100 text-gray-700 border border-gray-200 shrink-0">
                  MAIT Stories
                </span>
              </div>
              <p className="text-xs md:text-sm text-gray-500 font-medium mt-1 truncate">
                A visual journal of moments, memories, and stories from campus
              </p>
            </div>
          </div>

          {/* Premium Single 'Create' Button inside top header */}
          <motion.button
            onClick={() => setIsDiaryCreatorOpen(true)}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.96 }}
            className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-gray-900 hover:bg-gray-800 text-white font-extrabold text-xs sm:text-sm shadow-sm transition-all cursor-pointer shrink-0 border border-gray-800 min-h-[44px] min-w-[44px]"
            aria-label="Create new story entry"
          >
            <Sparkles size={16} className="text-amber-300 animate-pulse shrink-0" />
            <span>Create</span>
          </motion.button>
        </div>

        {/* Horizontally Scrollable Row of Equal-Weight Pill Tabs with no clipping */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-3 pt-1">
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-none py-1 px-0.5">
            {FILTER_TABS.map((tab) => {
              const isActive = activeFilter === tab.value;
              return (
                <button
                  key={tab.value}
                  onClick={() => setActiveFilter(tab.value)}
                  className={`relative px-4 sm:px-5 py-2 rounded-full text-xs sm:text-sm font-bold transition-all duration-200 flex items-center justify-center gap-2 whitespace-nowrap shrink-0 cursor-pointer min-h-[42px] ${
                    isActive
                      ? 'bg-gray-900 text-white shadow-sm border border-gray-900'
                      : 'bg-white text-gray-600 border border-gray-200 shadow-2xs hover:bg-gray-50 hover:text-gray-900'
                  }`}
                  aria-pressed={isActive}
                >
                  <span className={`transition-colors ${isActive ? 'text-white' : 'text-gray-400'}`}>
                    {tab.icon}
                  </span>
                  <span className="tracking-tight">
                    {tab.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* ── Feed Content Body ───────────────────────────────────── */}
      <main className="max-w-7xl mx-auto pt-6 pb-6 md:pb-10">
        {/* Friends who wrote recently (if Friends tab is active) */}
        {activeFilter === 'friends' && <FriendsRow writers={friendWriters} />}

        {/* Masonry Card Grid */}
        <div className="px-3 sm:px-6">
          <DiaryMasonryGrid
            filter={activeFilter}
            followingIds={followingIds}
            newEntry={newDiaryEntry}
          />
        </div>
      </main>

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

