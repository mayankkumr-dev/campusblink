import React from 'react';
import { Skeleton } from 'boneyard-js/react';

type BoneyardWrapperProps = {
  loading: boolean;
  children: React.ReactNode;
  name?: string;
};

const SKELETON_COLOR = '#F0EEE9';

function BoneyardWrapper({ loading, children, name }: BoneyardWrapperProps) {
  return (
    <Skeleton name={name || 'campus-blink-page'} loading={loading} color={SKELETON_COLOR}>
      {children}
    </Skeleton>
  );
}

export function DashboardSkeleton({ loading, children, name = 'dashboard-skeleton' }: BoneyardWrapperProps) {
  return <BoneyardWrapper loading={loading} name={name}>{children}</BoneyardWrapper>;
}

export function CommunityFeedSkeleton({ loading, children, name = 'community-feed-skeleton' }: BoneyardWrapperProps) {
  return <BoneyardWrapper loading={loading} name={name}>{children}</BoneyardWrapper>;
}

export function PostCardSkeleton({ loading, children, name = 'post-card-skeleton' }: BoneyardWrapperProps) {
  return <BoneyardWrapper loading={loading} name={name}>{children}</BoneyardWrapper>;
}

export function MarketplaceSkeleton({ loading, children, name = 'marketplace-skeleton' }: BoneyardWrapperProps) {
  return <BoneyardWrapper loading={loading} name={name}>{children}</BoneyardWrapper>;
}

export function ListingCardSkeleton({ loading, children, name = 'listing-card-skeleton' }: BoneyardWrapperProps) {
  return <BoneyardWrapper loading={loading} name={name}>{children}</BoneyardWrapper>;
}

export function CanteenSkeleton({ loading, children, name = 'canteen-skeleton' }: BoneyardWrapperProps) {
  return <BoneyardWrapper loading={loading} name={name}>{children}</BoneyardWrapper>;
}

export function MenuItemSkeleton({ loading, children, name = 'menu-item-skeleton' }: BoneyardWrapperProps) {
  return <BoneyardWrapper loading={loading} name={name}>{children}</BoneyardWrapper>;
}

export function ProfileSkeleton({ loading, children, name = 'profile-skeleton' }: BoneyardWrapperProps) {
  return <BoneyardWrapper loading={loading} name={name}>{children}</BoneyardWrapper>;
}

export function AdminTableSkeleton({ loading, children, name = 'admin-table-skeleton' }: BoneyardWrapperProps) {
  return <BoneyardWrapper loading={loading} name={name}>{children}</BoneyardWrapper>;
}

export function AdminStatsSkeleton({ loading, children, name = 'admin-stats-skeleton' }: BoneyardWrapperProps) {
  return <BoneyardWrapper loading={loading} name={name}>{children}</BoneyardWrapper>;
}

export function SearchResultsSkeleton({ loading, children, name = 'search-results-skeleton' }: BoneyardWrapperProps) {
  return <BoneyardWrapper loading={loading} name={name}>{children}</BoneyardWrapper>;
}

export function NotificationsSkeleton({ loading, children, name = 'notifications-skeleton' }: BoneyardWrapperProps) {
  return <BoneyardWrapper loading={loading} name={name}>{children}</BoneyardWrapper>;
}
