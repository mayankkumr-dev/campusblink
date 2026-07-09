import React from 'react';

type ListSkeletonProps = {
  rows?: number;
  className?: string;
};

const baseStyle = { backgroundColor: 'var(--bg-3)' };
const contrastStyle = { backgroundColor: 'var(--bg-4)' };

const Block = ({ className = '', contrast = false }: { className?: string; contrast?: boolean }) => (
  <div className={`animate-pulse rounded ${className}`} style={contrast ? contrastStyle : baseStyle} />
);

export const PostSkeleton: React.FC = () => {
  return (
    <article className="rounded-[16px] border border-black/10 bg-[var(--bg)] p-4 md:p-5">
      <div className="flex gap-3">
        <Block className="h-11 w-11 shrink-0 rounded-full" />
        <div className="min-w-0 flex-1 space-y-3">
          <div className="flex items-center gap-2">
            <Block className="h-4 w-32" />
            <Block className="h-3 w-20" contrast />
          </div>
          <Block className="h-4 w-11/12" />
          <Block className="h-4 w-9/12" contrast />
          <Block className="h-52 w-full rounded-[12px]" />
          <div className="flex items-center justify-between pt-1">
            <Block className="h-8 w-20 rounded-full" contrast />
            <Block className="h-8 w-20 rounded-full" contrast />
            <Block className="h-8 w-20 rounded-full" contrast />
          </div>
        </div>
      </div>
    </article>
  );
};

export const ProductSkeleton: React.FC = () => {
  return (
    <div className="overflow-hidden rounded-[12px] border border-[var(--border)] bg-[var(--bg)] p-2.5">
      <Block className="aspect-[1/0.9] w-full rounded-[8px]" />
      <div className="space-y-2 pt-2.5">
        <div className="flex items-start justify-between gap-2">
          <Block className="h-4 w-32" />
          <Block className="h-4 w-16" contrast />
        </div>
        <Block className="h-3 w-24" contrast />
        <div className="flex items-center justify-between pt-1">
          <Block className="h-6 w-16 rounded-full" contrast />
          <Block className="h-6 w-20 rounded-full" contrast />
        </div>
      </div>
    </div>
  );
};

export const ProfileSkeleton: React.FC = () => {
  return (
    <section className="w-full max-w-[600px] border-x border-black/10 bg-[var(--bg)]">
      <Block className="h-[220px] w-full rounded-none" />
      <div className="relative -mt-12 px-4 md:px-8">
        <Block className="h-28 w-28 rounded-full border-4 border-[var(--bg)]" contrast />
      </div>
      <div className="space-y-4 px-4 pb-6 pt-4 md:px-8">
        <Block className="h-6 w-44" />
        <Block className="h-4 w-64" contrast />
        <div className="grid grid-cols-3 gap-3 pt-2">
          <Block className="h-16 w-full rounded-[8px]" />
          <Block className="h-16 w-full rounded-[8px]" />
          <Block className="h-16 w-full rounded-[8px]" />
        </div>
      </div>
    </section>
  );
};

export const ListSkeleton: React.FC<ListSkeletonProps> = ({ rows = 5, className = '' }) => {
  return (
    <div className={`space-y-3 ${className}`}>
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="rounded-[10px] border border-[var(--border)] bg-[var(--bg)] p-3">
          <div className="flex items-center gap-3">
            <Block className="h-10 w-10 rounded-full" />
            <div className="min-w-0 flex-1 space-y-2">
              <Block className="h-4 w-3/5" />
              <Block className="h-3 w-2/5" contrast />
            </div>
            <Block className="h-7 w-20 rounded-full" contrast />
          </div>
        </div>
      ))}
    </div>
  );
};
