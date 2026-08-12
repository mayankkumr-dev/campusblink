import React from 'react';
import { useOutletContext, useNavigate } from 'react-router';
import { Settings, Sun, Moon, Monitor, LogOut } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useAuthStore } from '../../store/authStore';
import { supabase } from '../../lib/supabase';
import { updatePrintShopAvailability } from '../../api/print';
import toast from 'react-hot-toast';

export const AdminPrintSettingsPage: React.FC = () => {
  const { shop, setShop } = useOutletContext<{ shop: any; setShop: any }>();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();

  const isOpen = Boolean(shop?.is_open_now || shop?.is_active);

  const handleToggleShopStatus = async () => {
    if (!shop?.id) return;
    const nextState = isOpen ? 'closed' : 'open';
    const { data, error } = await updatePrintShopAvailability(shop.id, nextState);
    if (error) {
      toast.error(error.message || 'Failed to update shop status');
      return;
    }
    setShop(data);
    toast.success(nextState === 'open' ? 'Shop forced open.' : nextState === 'closed' ? 'Shop forced closed.' : 'Shop back on schedule.');
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    useAuthStore.getState().logout();
    navigate('/');
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 w-full h-full">
      {/* Desktop Settings View */}
      <div className="hidden md:block space-y-6 mx-auto max-w-3xl p-8">
        <div className="rounded-3xl border border-[#e0e0e0] dark:border-[#38383a] bg-white dark:bg-[#1c1c1e] p-6 sm:p-8 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#0066cc]/10 border border-[#0066cc]/20 text-[#0066cc]">
              {theme === 'dark' ? <Moon className="h-6 w-6" /> : <Sun className="h-6 w-6" />}
            </div>
            <div>
              <h2 className="font-syne text-xl font-extrabold text-[#1d1d1f] dark:text-[#f5f5f7]">
                Appearance
              </h2>
              <p className="mt-1 text-sm text-[#86868b]">
                Customize how your print dashboard looks.
              </p>
            </div>
          </div>
          
          <div className="flex rounded-xl border border-[#e0e0e0] dark:border-[#38383a] bg-[#f5f5f7] dark:bg-[#2c2c2e] p-1 self-start md:self-auto">
            {[
              { id: 'light', label: 'Light', icon: Sun },
              { id: 'dark', label: 'Dark', icon: Moon },
              { id: 'system', label: 'System', icon: Monitor },
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTheme(t.id)}
                className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-bold capitalize transition-colors ${
                  theme === t.id
                    ? 'bg-[#0066cc] text-white shadow-sm'
                    : 'text-[#86868b] hover:text-[#1d1d1f] dark:hover:text-[#f5f5f7]'
                }`}
              >
                <t.icon className="h-4 w-4" />
                <span className="inline">{t.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-[#e0e0e0] dark:border-[#38383a] bg-white dark:bg-[#1c1c1e] p-12 sm:p-16 text-center shadow-sm">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-[#0066cc]/10 border border-[#0066cc]/20 text-[#0066cc]">
            <Settings className="h-9 w-9 stroke-[1.8]" />
          </div>
          <span className="inline-flex items-center gap-1 rounded-full bg-[#0066cc]/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-[#0066cc] mb-3">
            Under Active Development
          </span>
          <h2 className="font-syne text-2xl sm:text-3xl font-extrabold text-[#1d1d1f] dark:text-[#f5f5f7]">
            Hardware & Driver Calibration
          </h2>
          <p className="mx-auto mt-2.5 max-w-md text-xs sm:text-sm text-[#86868b] leading-relaxed">
            Direct IP/USB printer discovery, automated double-sided tray assignment, and real-time ink consumption analytics are currently being fine-tuned. Use the Live Shop Status toggle at the top to manage immediate availability.
          </p>
        </div>
      </div>

      {/* Mobile Settings View */}
      <div className="md:hidden flex flex-col min-h-dvh bg-[#f5f5f7] dark:bg-[#000000] pb-[calc(5.5rem+env(safe-area-inset-bottom))]">
        <header className="sticky top-0 z-40 bg-white/95 dark:bg-[#1c1c1e]/95 backdrop-blur-md shadow-sm border-b border-[#e0e0e0] dark:border-[#38383a] px-4 pt-3.5 pb-3 flex items-center justify-between">
          <div>
            <h1 className="font-syne text-xl font-extrabold text-[#1d1d1f] dark:text-[#f5f5f7] tracking-tight">
              Print Settings
            </h1>
            <p className="text-[11px] font-semibold text-[#86868b] mt-0.5">
              Hardware & Configuration
            </p>
          </div>

          <div
            onClick={handleToggleShopStatus}
            className={`cursor-pointer inline-flex items-center gap-2 px-3 py-1.5 rounded-full transition-all active:scale-95 ${
              isOpen
                ? 'bg-[#34c759]/10 text-[#34c759] border border-[#34c759]/20'
                : 'bg-[#f5f5f7] dark:bg-[#2c2c2e] text-[#86868b] border border-transparent'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                isOpen ? 'bg-[#34c759] animate-pulse' : 'bg-[#86868b]'
              }`}
            />
            <span className="text-xs font-bold font-syne">
              {isOpen ? 'Accepting Jobs' : 'Closed'}
            </span>
          </div>
        </header>

        <div className="p-4 space-y-4">
          <div className="rounded-3xl bg-white dark:bg-[#1c1c1e] p-5 shadow-sm border border-[#e0e0e0] dark:border-[#38383a]">
            <div className="mb-4">
              <h3 className="font-syne font-bold text-base text-[#1d1d1f] dark:text-[#f5f5f7]">
                Appearance
              </h3>
              <p className="text-xs text-[#86868b]">
                Customize how Print Dashboard looks on your device.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {[
                { id: 'light', label: 'Light Mode' },
                { id: 'dark', label: 'Dark Mode' },
                { id: 'system', label: 'System' },
              ].map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTheme(t.id)}
                  className={`flex flex-col items-center justify-center py-3 px-2 rounded-2xl border-2 font-syne text-xs font-bold transition-all ${
                    theme === t.id
                      ? 'border-[#0066cc] bg-[#0066cc]/10 text-[#0066cc]'
                      : 'border-[#e0e0e0] dark:border-[#38383a] bg-[#f5f5f7] dark:bg-[#2c2c2e] text-[#86868b]'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-3xl bg-white dark:bg-[#1c1c1e] p-5 shadow-sm border border-[#e0e0e0] dark:border-[#38383a] flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-[#86868b]">
                Active Shop
              </p>
              <p className="font-syne font-extrabold text-base text-[#1d1d1f] dark:text-[#f5f5f7] mt-0.5">
                {shop?.name || 'Campus Print'}
              </p>
            </div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#34c759]/10 text-[#34c759] font-syne font-bold text-xs">
              Active
            </span>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-3.5 rounded-2xl text-[#ff3b30] bg-white dark:bg-[#1c1c1e] border border-[#ff3b30]/20 hover:bg-[#ff3b30]/10 transition-colors font-bold text-sm shadow-sm"
          >
            <LogOut className="w-4 h-4" /> Sign Out
          </button>
        </div>
      </div>
    </div>
  );
};
