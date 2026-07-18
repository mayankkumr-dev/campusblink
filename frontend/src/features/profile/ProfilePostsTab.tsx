import React from 'react';
import { BookOpen } from 'lucide-react';
import { DiaryProfileGrid } from '../community/DiaryProfileGrid';

export interface ProfilePostsTabProps {
  activeTab?: string;
  onTabChange?: (tab: string) => void;
  isLoadingContent?: boolean;
  content?: any[];
  viewerProfile: any;
  /** The user whose profile is being viewed — used for diary grid */
  profileUserId?: string;
  onLike?: (postId: string, likedByMe: boolean) => void;
  lightbox?: { images: string[]; index: number } | null;
  onOpenImage?: (images: string[], index: number) => void;
  onCloseLightbox?: () => void;
  onNavigateCreatePost?: () => void;
}

export const ProfilePostsTab: React.FC<ProfilePostsTabProps> = ({
  profileUserId,
}) => {
  return (
    <>
      {/* Diaries Section Header */}
      <div className="border-b border-border-subtle px-6 bg-surface sticky top-14 z-20">
        <div className="flex gap-0 overflow-x-auto scrollbar-hide">
          <div
            className="relative flex-shrink-0 py-3.5 px-3 text-sm font-semibold capitalize flex items-center gap-1.5 text-violet-600 border-b-2 border-violet-500"
          >
            <BookOpen size={13} />
            Diaries
          </div>
        </div>
      </div>

      {/* Diary Grid */}
      <div className="bg-surface min-h-[260px]">
        {profileUserId ? (
          <DiaryProfileGrid userId={profileUserId} />
        ) : (
          <div className="py-16 text-center text-sm text-text-secondary">Loading diary...</div>
        )}
      </div>
    </>
  );
};
