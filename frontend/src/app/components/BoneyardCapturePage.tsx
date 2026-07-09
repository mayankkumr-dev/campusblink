import React from 'react';
import {
  AdminStatsSkeleton,
  CanteenSkeleton,
  CommunityFeedSkeleton,
  DashboardSkeleton,
  ListingCardSkeleton,
  MarketplaceSkeleton,
  NotificationsSkeleton,
  PostCardSkeleton,
  ProfileSkeleton,
  SearchResultsSkeleton,
} from './BoneyardSkeletons';

const Block = ({ className = '' }: { className?: string }) => (
  <div className={`rounded-md bg-[#F0EEE9] ${className}`} />
);

export const BoneyardCapturePage: React.FC = () => {
  return (
    <div className="min-h-screen bg-[var(--bg)] p-6 space-y-8">
      <h1 className="text-xl font-bold text-[var(--text-primary)]">Boneyard Capture</h1>

      <DashboardSkeleton loading={false} name="student-dashboard">
        <section className="space-y-4 rounded-lg border border-black/10 p-4">
          <Block className="h-7 w-[200px]" />
          <Block className="h-4 w-[120px] rounded" />
          <div className="grid grid-cols-2 gap-4">
            <Block className="h-28 w-full" />
            <Block className="h-28 w-full" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Block className="h-32 w-full" />
            <Block className="h-32 w-full" />
            <Block className="h-32 w-full" />
            <Block className="h-32 w-full" />
          </div>
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, idx) => (
              <div key={idx} className="flex items-center gap-3">
                <Block className="h-10 w-10 rounded-full" />
                <div className="space-y-2 w-full">
                  <Block className="h-3 w-full" />
                  <Block className="h-3 w-3/5" />
                </div>
              </div>
            ))}
          </div>
        </section>
      </DashboardSkeleton>

      <CommunityFeedSkeleton loading={false} name="community-feed-main">
        <section className="space-y-4 rounded-lg border border-black/10 p-4">
          <div className="flex items-start gap-3">
            <Block className="h-10 w-10 rounded-full" />
            <Block className="h-20 w-full" />
          </div>
          {Array.from({ length: 5 }).map((_, idx) => (
            <div key={idx} className="space-y-3 border-b border-black/10 pb-4">
              <div className="flex items-start gap-3">
                <Block className="h-10 w-10 rounded-full" />
                <div className="w-full space-y-2">
                  <div className="flex gap-2">
                    <Block className="h-3 w-[120px]" />
                    <Block className="h-3 w-[80px]" />
                    <Block className="h-3 w-[60px]" />
                  </div>
                  <Block className="h-4 w-[200px]" />
                  <Block className="h-3 w-full" />
                  <Block className="h-3 w-4/5" />
                  <Block className="h-3 w-3/5" />
                  <div className="flex gap-2">
                    <Block className="h-3 w-12" />
                    <Block className="h-3 w-12" />
                    <Block className="h-3 w-12" />
                    <Block className="h-3 w-12" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </section>
      </CommunityFeedSkeleton>

      <MarketplaceSkeleton loading={false} name="marketplace-main">
        <section className="space-y-4 rounded-lg border border-black/10 p-4">
          <Block className="h-10 w-full" />
          <div className="flex gap-2 overflow-hidden">
            {Array.from({ length: 5 }).map((_, idx) => (
              <Block key={idx} className="h-8 w-20 rounded-full" />
            ))}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {Array.from({ length: 8 }).map((_, idx) => (
              <div key={idx} className="space-y-2">
                <Block className="aspect-[4/3] w-full" />
                <Block className="h-3 w-3/5" />
                <Block className="h-3 w-2/5" />
                <Block className="h-3 w-20" />
              </div>
            ))}
          </div>
        </section>
      </MarketplaceSkeleton>

      <CanteenSkeleton loading={false} name="canteen-main">
        <section className="space-y-4 rounded-lg border border-black/10 p-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, idx) => (
              <div key={idx} className="space-y-2 rounded-lg border border-black/10 p-3">
                <Block className="h-12 w-12 rounded-full" />
                <Block className="h-3 w-24" />
                <Block className="h-3 w-20" />
              </div>
            ))}
          </div>
          <div className="flex gap-2 overflow-hidden">
            {Array.from({ length: 5 }).map((_, idx) => (
              <Block key={idx} className="h-8 w-20 rounded-full" />
            ))}
          </div>
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, idx) => (
              <div key={idx} className="flex items-start gap-3">
                <Block className="h-14 w-14 rounded-full" />
                <div className="w-full space-y-2">
                  <Block className="h-3 w-[150px]" />
                  <Block className="h-3 w-20" />
                  <Block className="h-3 w-full" />
                </div>
              </div>
            ))}
          </div>
        </section>
      </CanteenSkeleton>

      <ListingCardSkeleton loading={false} name="print-page-main">
        <section className="space-y-4 rounded-lg border border-black/10 p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {Array.from({ length: 3 }).map((_, idx) => (
              <Block key={idx} className="h-24 w-full" />
            ))}
          </div>
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, idx) => (
              <div key={idx} className="flex items-center justify-between gap-3">
                <Block className="h-4 w-[120px]" />
                <Block className="h-4 w-[60px]" />
              </div>
            ))}
          </div>
        </section>
      </ListingCardSkeleton>

      <ProfileSkeleton loading={false} name="profile-page-main">
        <section className="space-y-4 rounded-lg border border-black/10 p-4">
          <Block className="aspect-[4/1] w-full" />
          <Block className="-mt-10 h-24 w-24 rounded-full border-4 border-white" />
          <Block className="h-6 w-[180px]" />
          <Block className="h-4 w-[120px]" />
          <Block className="h-3 w-[300px]" />
          <div className="flex gap-2">
            <Block className="h-4 w-16" />
            <Block className="h-4 w-16" />
            <Block className="h-4 w-16" />
          </div>
          <div className="flex gap-2">
            <Block className="h-8 w-20" />
            <Block className="h-8 w-20" />
            <Block className="h-8 w-20" />
          </div>
        </section>
      </ProfileSkeleton>

      <AdminStatsSkeleton loading={false} name="admin-dashboard-main">
        <section className="space-y-4 rounded-lg border border-black/10 p-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {Array.from({ length: 6 }).map((_, idx) => (
              <div key={idx} className="space-y-2 rounded-lg border border-black/10 p-3">
                <Block className="h-5 w-24" />
                <Block className="h-4 w-16" />
              </div>
            ))}
          </div>
          <Block className="h-[300px] w-full" />
          <div className="space-y-2">
            {Array.from({ length: 8 }).map((_, idx) => (
              <div key={idx} className="flex items-center gap-3">
                <Block className="h-4 w-4 rounded-full" />
                <Block className="h-4 w-full" />
              </div>
            ))}
          </div>
        </section>
      </AdminStatsSkeleton>

      <SearchResultsSkeleton loading={false} name="search-page-results">
        <section className="space-y-3 rounded-lg border border-black/10 p-4">
          <Block className="h-5 w-40" />
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, idx) => (
              <Block key={idx} className="h-16 w-full" />
            ))}
          </div>
          <Block className="h-5 w-40" />
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, idx) => (
              <Block key={idx} className="h-14 w-full" />
            ))}
          </div>
        </section>
      </SearchResultsSkeleton>

      <NotificationsSkeleton loading={false} name="student-notifications">
        <section className="space-y-3 rounded-lg border border-black/10 p-4">
          {Array.from({ length: 5 }).map((_, idx) => (
            <div key={idx} className="flex items-center gap-3">
              <Block className="h-10 w-10 rounded-full" />
              <div className="w-full space-y-2">
                <Block className="h-3 w-full" />
                <Block className="h-3 w-3/5" />
              </div>
            </div>
          ))}
        </section>
      </NotificationsSkeleton>

      <DashboardSkeleton loading={false} name="professor-dashboard-main">
        <section className="space-y-4 rounded-lg border border-black/10 p-4">
          <Block className="h-7 w-[220px]" />
          <div className="grid grid-cols-2 gap-3">
            <Block className="h-28 w-full" />
            <Block className="h-28 w-full" />
          </div>
        </section>
      </DashboardSkeleton>

      <PostCardSkeleton loading={false} name="saved-bookmarks-posts">
        <section className="space-y-3 rounded-lg border border-black/10 p-4">
          {Array.from({ length: 5 }).map((_, idx) => (
            <Block key={idx} className="h-20 w-full" />
          ))}
        </section>
      </PostCardSkeleton>
    </div>
  );
};
