import React from 'react';

const SHIMMER_STYLES = `
@keyframes pageSkeletonShimmerPulse {
  0%, 100% {
    background-color: var(--bg-3);
    border-color: var(--border);
    opacity: 0.7;
  }
  50% {
    background-color: var(--bg-2);
    border-color: var(--border);
    opacity: 1;
  }
}
`;

export interface SkeletonBlockProps {
  width?: string | number;
  height?: string | number;
  className?: string;
  style?: React.CSSProperties;
}

export const SkeletonBlock: React.FC<SkeletonBlockProps> = ({
  width,
  height,
  className = '',
  style = {},
}) => {
  return (
    <div
      className={`rounded-md border border-[var(--border)] ${className}`}
      style={{
        width,
        height,
        backgroundColor: 'var(--bg-3)',
        animation: 'pageSkeletonShimmerPulse 1.8s ease-in-out infinite',
        ...style,
      }}
    />
  );
};

export interface SkeletonAvatarProps {
  size?: string | number;
  className?: string;
}

export const SkeletonAvatar: React.FC<SkeletonAvatarProps> = ({
  size = 40,
  className = '',
}) => {
  return (
    <SkeletonBlock
      width={size}
      height={size}
      className={`rounded-full shrink-0 ${className}`}
    />
  );
};

export interface PageSkeletonProps {
  className?: string;
  children?: React.ReactNode;
}

export const PageSkeleton: React.FC<PageSkeletonProps> = ({
  className = '',
  children,
}) => {
  return (
    <div className={`min-h-screen w-full bg-[var(--bg)] flex flex-col ${className}`}>
      <style>{SHIMMER_STYLES}</style>

      {children ? (
        children
      ) : (
        <>
          {/* Header Skeleton */}
          <header className="h-16 border-b border-[var(--border)] px-4 md:px-8 flex items-center justify-between bg-[var(--bg)]">
            <div className="flex items-center gap-4">
              <SkeletonBlock width={36} height={36} className="rounded-lg" />
              <SkeletonBlock width={140} height={24} />
            </div>
            <div className="hidden md:flex items-center gap-6">
              <SkeletonBlock width={220} height={36} className="rounded-full" />
              <SkeletonBlock width={90} height={20} />
              <SkeletonBlock width={90} height={20} />
            </div>
            <div className="flex items-center gap-3">
              <SkeletonBlock width={36} height={36} className="rounded-full hidden sm:block" />
              <SkeletonAvatar size={40} />
            </div>
          </header>

          {/* Main Layout Skeleton */}
          <main className="flex-1 max-w-6xl w-full mx-auto px-4 md:px-8 py-8 flex flex-col gap-8">
            {/* Top Page Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-2.5 w-full max-w-md">
                <SkeletonBlock width="55%" height={32} />
                <SkeletonBlock width="85%" height={16} />
              </div>
              <div className="flex items-center gap-3">
                <SkeletonBlock width={100} height={38} />
                <SkeletonBlock width={120} height={38} />
              </div>
            </div>

            {/* Banner / Stat Widget Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <SkeletonBlock height={100} className="rounded-xl w-full" />
              <SkeletonBlock height={100} className="rounded-xl w-full" />
              <SkeletonBlock height={100} className="rounded-xl w-full" />
            </div>

            {/* Content Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="p-5 rounded-xl border border-[var(--border)] space-y-4 bg-[var(--bg)] flex flex-col"
                >
                  <div className="flex items-center gap-3">
                    <SkeletonAvatar size={42} />
                    <div className="flex-1 space-y-2">
                      <SkeletonBlock width="70%" height={16} />
                      <SkeletonBlock width="40%" height={12} />
                    </div>
                  </div>

                  <SkeletonBlock height={120} className="w-full rounded-lg" />

                  <div className="space-y-2 pt-1">
                    <SkeletonBlock width="95%" height={14} />
                    <SkeletonBlock width="65%" height={14} />
                  </div>

                  <div className="pt-3 border-t border-[var(--border)] flex items-center justify-between">
                    <SkeletonBlock width={60} height={20} />
                    <SkeletonBlock width={80} height={28} className="rounded-md" />
                  </div>
                </div>
              ))}
            </div>
          </main>
        </>
      )}
    </div>
  );
};
