import React from 'react';
import { Search, Bell } from 'lucide-react';

export interface CanteenStatsHeaderProps {
  activeView: string;
  newOrdersCount: number;
}

export const CanteenStatsHeader: React.FC<CanteenStatsHeaderProps> = ({
  activeView,
  newOrdersCount,
}) => {
  return (
    <header className="sticky top-0 z-10 flex h-20 items-center justify-between border-b border-border-subtle dark:border-shop-border-subtle bg-white/90 dark:bg-shop-bg-base/90 px-6 backdrop-blur-md lg:px-10">
      <div className="flex items-center gap-3.5 min-w-0">
        <h1 className="font-syne text-2xl font-extrabold tracking-tight text-text-primary dark:text-shop-text-primary md:text-3xl">
          {activeView}
        </h1>
        {activeView === 'Live Orders' && (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-500 dark:bg-shop-accent px-3 py-1 text-xs font-bold text-white shadow-2xs dark:shadow-none">
            {newOrdersCount} New
          </span>
        )}
      </div>

      <div className="flex items-center gap-4">
        <div className="relative hidden md:block">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-text-secondary/70 dark:text-shop-text-tertiary" />
          <input
            placeholder="Search orders or items..."
            className="w-72 rounded-2xl border border-border-subtle dark:border-shop-border-subtle bg-surface dark:bg-shop-bg-surface py-2 pl-10 pr-4 text-xs text-text-primary dark:text-shop-text-primary placeholder:text-slate-400 dark:placeholder:text-shop-text-tertiary focus:border-amber-500 dark:focus:border-shop-accent focus:bg-surface dark:focus:bg-shop-bg-surface focus:outline-none transition-all"
          />
        </div>
        <button
          type="button"
          className="relative rounded-2xl border border-border-subtle dark:border-shop-border-subtle bg-surface dark:bg-shop-bg-surface p-2.5 text-text-secondary dark:text-shop-text-secondary transition-colors hover:bg-surface-elevated dark:hover:bg-shop-bg-surface-hover hover:text-text-primary dark:hover:text-shop-text-primary"
          aria-label="Notifications"
        >
          <Bell className="h-4.5 w-4.5 stroke-[2]" />
          {newOrdersCount > 0 && (
            <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-rose-500 dark:bg-red-500" />
          )}
        </button>
      </div>
    </header>
  );
};
