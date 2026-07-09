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
    <header className="sticky top-0 z-10 flex h-20 items-center justify-between border-b border-slate-100 bg-white/90 px-6 backdrop-blur-md lg:px-10">
      <div className="flex items-center gap-3.5 min-w-0">
        <h1 className="font-syne text-2xl font-extrabold tracking-tight text-slate-900 md:text-3xl">
          {activeView}
        </h1>
        {activeView === 'Live Orders' && (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-500 px-3 py-1 text-xs font-bold text-white shadow-2xs">
            {newOrdersCount} New
          </span>
        )}
      </div>

      <div className="flex items-center gap-4">
        <div className="relative hidden md:block">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            placeholder="Search orders or items..."
            className="w-72 rounded-2xl border border-slate-200 bg-slate-50 py-2 pl-10 pr-4 text-xs text-slate-800 placeholder:text-slate-400 focus:border-amber-500 focus:bg-white focus:outline-none transition-all"
          />
        </div>
        <button
          type="button"
          className="relative rounded-2xl border border-slate-200 bg-white p-2.5 text-slate-600 transition-colors hover:bg-slate-50"
          aria-label="Notifications"
        >
          <Bell className="h-4.5 w-4.5 stroke-[2]" />
          {newOrdersCount > 0 && (
            <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-rose-500" />
          )}
        </button>
      </div>
    </header>
  );
};
