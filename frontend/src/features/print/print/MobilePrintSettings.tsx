import React from 'react';
import { Settings, Printer, Bell, Shield, Sliders, CheckCircle2 } from 'lucide-react';

export interface MobilePrintSettingsProps {
  shop: any;
  onOverride: (nextOverride: string | null) => Promise<void>;
}

export const MobilePrintSettings: React.FC<MobilePrintSettingsProps> = ({
  shop,
  onOverride,
}) => {
  const [, forceUpdate] = React.useState({});
  const isOpen = Boolean(shop?.is_open_now || shop?.is_active);

  React.useEffect(() => {
    const handleStorage = () => forceUpdate({});
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const handleToggleShopStatus = async () => {
    const nextState = isOpen ? 'closed' : 'open';
    await onOverride(nextState);
  };

  return (
    <div className="flex flex-col min-h-dvh bg-[#FAFAFA] dark:bg-shop-bg-base text-gray-900 dark:text-shop-text-primary font-sans pb-28 select-none transition-colors">
      {/* Pinned Sticky Header */}
      <header className="sticky top-0 z-40 bg-white/95 dark:bg-shop-bg-surface/95 backdrop-blur-md border-b border-gray-100 dark:border-shop-border-subtle px-4 py-3.5 shadow-[0_2px_15px_rgba(0,0,0,0.03)] dark:shadow-none flex items-center justify-between transition-colors">
        <div>
          <h1 className="font-syne text-xl font-extrabold text-gray-900 dark:text-shop-text-primary tracking-tight">
            Print Settings
          </h1>
          <p className="text-[11px] font-semibold text-gray-400 dark:text-shop-text-secondary mt-0.5">
            Hardware & Shop Configuration
          </p>
        </div>

        {/* Status Toggle Switch */}
        <div
          onClick={handleToggleShopStatus}
          className={`cursor-pointer inline-flex items-center gap-2 px-3 py-1.5 rounded-full transition-all active:scale-95 ${
            isOpen
              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40'
              : 'bg-gray-100 dark:bg-shop-bg-surface-raised text-gray-600 dark:text-shop-text-secondary border border-transparent dark:border-shop-border-subtle'
          }`}
        >
          <span
            className={`w-2 h-2 rounded-full ${
              isOpen ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400'
            }`}
          />
          <span className="text-xs font-bold font-syne">
            {isOpen ? 'Accepting jobs' : 'Closed'}
          </span>
          <div
            className={`w-8 h-4 rounded-full p-0.5 transition-colors flex items-center ${
              isOpen ? 'bg-emerald-600' : 'bg-gray-300 dark:bg-shop-border-strong'
            }`}
          >
            <div
              className={`w-3 h-3 rounded-full bg-white shadow-xs transition-transform ${
                isOpen ? 'translate-x-4' : 'translate-x-0'
              }`}
            />
          </div>
        </div>
      </header>

      {/* Hardware Configuration & Shop Preferences */}
      <div className="p-4 space-y-5">
        {/* Hardware Configuration Placeholder Card */}
        <div className="relative overflow-hidden rounded-3xl bg-white dark:bg-shop-bg-surface p-8 sm:p-12 text-center shadow-[0_8px_35px_rgba(0,0,0,0.04)] dark:shadow-none border border-gray-100 dark:border-shop-border-subtle transition-colors">
          <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-blue-500/5 blur-2xl pointer-events-none" />

          {/* Centered Gear Icon with Generous Breathing Room */}
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-blue-50 dark:bg-blue-900/30 border border-blue-100 dark:border-blue-800/40 text-blue-600 dark:text-blue-400 shadow-sm">
            <Settings className="h-9 w-9 stroke-[1.8]" />
          </div>

          <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800/40 px-3.5 py-1 text-[11px] font-extrabold uppercase tracking-wider text-blue-700 dark:text-blue-300 mb-3.5 font-syne">
            <Sliders className="w-3 h-3" /> Under Active Development
          </span>

          <h2 className="font-syne text-xl sm:text-2xl font-extrabold text-gray-900 dark:text-shop-text-primary tracking-tight">
            Automated Hardware & Driver Calibration
          </h2>

          <p className="mx-auto mt-2.5 max-w-sm text-xs sm:text-sm text-gray-500 dark:text-shop-text-secondary leading-relaxed font-medium">
            Direct IP/USB printer discovery, automated double-sided tray assignment,
            and real-time ink consumption analytics are currently being fine-tuned.
          </p>

          <div className="mt-8 pt-6 border-t border-gray-100 dark:border-shop-border-subtle grid grid-cols-2 gap-3 text-left">
            <div className="rounded-2xl bg-gray-50 dark:bg-shop-bg-surface-raised p-3.5">
              <div className="flex items-center gap-2 text-xs font-bold text-gray-800 dark:text-shop-text-primary font-syne">
                <Printer className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span>Auto-Duplex</span>
              </div>
              <p className="text-[11px] text-gray-400 dark:text-shop-text-secondary mt-1">
                Paper-saving double sided default
              </p>
            </div>

            <div className="rounded-2xl bg-gray-50 dark:bg-shop-bg-surface-raised p-3.5">
              <div className="flex items-center gap-2 text-xs font-bold text-gray-800 dark:text-shop-text-primary font-syne">
                <Shield className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>Secure Print</span>
              </div>
              <p className="text-[11px] text-gray-400 dark:text-shop-text-secondary mt-1">
                PIN-protected document pickup
              </p>
            </div>
          </div>
        </div>

        {/* Shop Info Card */}
        <div className="rounded-3xl bg-white dark:bg-shop-bg-surface p-5 shadow-[0_4px_20px_rgba(0,0,0,0.03)] dark:shadow-none border border-gray-100 dark:border-shop-border-subtle flex items-center justify-between transition-colors">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-shop-text-secondary">
              Active Shop Profile
            </p>
            <p className="font-syne font-extrabold text-base text-gray-900 dark:text-shop-text-primary mt-0.5">
              {shop?.name || 'My Campus Print Shop'}
            </p>
          </div>

          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 font-syne font-bold text-xs">
            <CheckCircle2 className="w-3.5 h-3.5" /> Active
          </span>
        </div>

        {/* Mobile Theme Appearance Switcher */}
        <div className="rounded-3xl bg-white dark:bg-shop-bg-surface p-5 shadow-[0_4px_20px_rgba(0,0,0,0.03)] dark:shadow-none border border-gray-100 dark:border-shop-border-subtle transition-colors">
          <div className="mb-4">
            <h3 className="font-syne font-bold text-base text-gray-900 dark:text-shop-text-primary">
              Appearance
            </h3>
            <p className="text-xs text-gray-400 dark:text-shop-text-secondary">
              Customize how Campus Blink Print Shop looks on this device.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {[
              { id: 'light', label: 'Light Mode' },
              { id: 'dark', label: 'Dark Mode' },
              { id: 'system', label: 'System' },
            ].map((themeOpt) => {
              const currentTheme =
                typeof document !== 'undefined'
                  ? document.documentElement.classList.contains('dark')
                    ? 'dark'
                    : 'light'
                  : 'light';
              const isSelected =
                themeOpt.id === 'system'
                  ? !localStorage.getItem('theme')
                  : localStorage.getItem('theme') === themeOpt.id ||
                    (!localStorage.getItem('theme') && currentTheme === themeOpt.id);

              return (
                <button
                  key={themeOpt.id}
                  type="button"
                  onClick={() => {
                    if (themeOpt.id === 'system') {
                      localStorage.removeItem('theme');
                      if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
                        document.documentElement.classList.add('dark');
                      } else {
                        document.documentElement.classList.remove('dark');
                      }
                    } else {
                      localStorage.setItem('theme', themeOpt.id);
                      if (themeOpt.id === 'dark') {
                        document.documentElement.classList.add('dark');
                      } else {
                        document.documentElement.classList.remove('dark');
                      }
                    }
                    window.dispatchEvent(new Event('storage'));
                  }}
                  className={`flex flex-col items-center justify-center py-3 px-2 rounded-2xl border-2 font-syne text-xs font-bold transition-all ${
                    isSelected
                      ? 'border-amber-500 bg-amber-50/60 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400'
                      : 'border-gray-100 dark:border-shop-border-subtle bg-gray-50 dark:bg-shop-bg-surface-raised text-gray-600 dark:text-shop-text-secondary'
                  }`}
                >
                  {themeOpt.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
