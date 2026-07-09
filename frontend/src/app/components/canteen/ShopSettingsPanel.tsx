import React from 'react';
import { Power, Clock, ShieldCheck, Store } from 'lucide-react';

export interface ShopSettingsPanelProps {
  shop: any;
  onOverride: (nextOverride: string | null) => void;
}

export const ShopSettingsPanel: React.FC<ShopSettingsPanelProps> = ({ shop, onOverride }) => {
  const currentOverride = shop?.status_override || null;
  const isOpenNow = Boolean(shop?.is_open_now);

  return (
    <div className="mx-auto mb-8 max-w-7xl rounded-3xl border border-border-subtle bg-white/90 p-6 sm:p-7 backdrop-blur-md shadow-[0_4px_24px_rgba(0,0,0,0.03)] transition-all">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        {/* Left Status Area */}
        <div className="flex items-start gap-4">
          <div
            className={`flex h-13 w-13 shrink-0 items-center justify-center rounded-2xl border ${
              isOpenNow
                ? 'border-emerald-100 bg-accent-green/15 text-accent-green'
                : 'border-rose-100 bg-accent-red/15 text-accent-red'
            }`}
          >
            <Store className="h-6 w-6 stroke-[2]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wider ${
                  isOpenNow
                    ? 'bg-accent-green/15 text-accent-green border border-accent-green/20'
                    : 'bg-accent-red/15 text-accent-red border border-accent-red/20'
                }`}
              >
                <span
                  className={`h-2 w-2 rounded-full ${
                    isOpenNow ? 'bg-accent-green animate-pulse' : 'bg-rose-500'
                  }`}
                />
                Live Shop Status
              </span>
            </div>
            <h2 className="mt-2 font-syne text-2xl font-extrabold tracking-tight text-text-primary">
              {isOpenNow ? 'Open & Accepting Orders' : 'Currently Closed'}
            </h2>
            <p className="mt-1 text-xs sm:text-sm text-text-secondary max-w-xl leading-relaxed">
              {shop?.shop_status_reason ||
                'Your canteen automatically operates based on scheduled operating hours unless manually overridden below.'}
            </p>
          </div>
        </div>

        {/* Sleek Pill-Shaped Toggle Buttons */}
        <div className="flex flex-wrap items-center gap-2.5 bg-slate-50/80 p-2 rounded-2xl border border-border-subtle">
          <button
            type="button"
            onClick={() => onOverride('open')}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all ${
              currentOverride === 'open'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-surface text-text-primary border border-border-subtle hover:bg-emerald-50 hover:text-accent-green hover:border-emerald-200'
            }`}
          >
            <Power className="h-3.5 w-3.5" />
            Open
          </button>
          <button
            type="button"
            onClick={() => onOverride('closed')}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all ${
              currentOverride === 'closed'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'bg-surface text-text-primary border border-border-subtle hover:bg-rose-50 hover:text-accent-red hover:border-rose-200'
            }`}
          >
            <Power className="h-3.5 w-3.5" />
            Closed
          </button>
          <button
            type="button"
            onClick={() => onOverride(null)}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all ${
              currentOverride === null
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-surface text-text-primary border border-border-subtle hover:bg-surface-elevated hover:text-text-primary'
            }`}
          >
            <Clock className="h-3.5 w-3.5" />
            Schedule
          </button>
        </div>
      </div>
    </div>
  );
};
