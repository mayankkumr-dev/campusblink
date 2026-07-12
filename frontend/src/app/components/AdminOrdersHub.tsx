import React from 'react';
import { useSearchParams } from 'react-router';
import { AdminCanteenOrdersPage } from './AdminCanteenOrdersPage';
import { AdminPrintOrdersPage } from './AdminPrintOrdersPage';
import { AdminCanteenMenuPage } from './AdminCanteenMenuPage';
import { ShoppingBag, Printer, UtensilsCrossed, Activity, Clock, AlertCircle } from 'lucide-react';

export const AdminOrdersHub: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'canteen';

  const tabs = [
    { id: 'canteen', label: 'Canteen Orders', icon: ShoppingBag },
    { id: 'print', label: 'Print Orders', icon: Printer },
    { id: 'menu', label: 'Canteen Menu Catalog', icon: UtensilsCrossed },
  ] as const;

  return (
    <div>
      {/* ── MOBILE VIEWPORT ONLY ── */}
      <div className="md:hidden flex flex-col font-sans text-slate-900 dark:text-admin-text-primary bg-[#F8FAFC] dark:bg-admin-bg-base min-h-screen pb-16 transition-colors">
        {/* Mobile Header */}
        <div className="px-4 pt-4 pb-2 bg-white dark:bg-admin-bg-surface transition-colors">
          <h2 className="font-syne text-xl font-extrabold text-slate-900 dark:text-admin-text-primary tracking-tight transition-colors">
            Shop Operations
          </h2>
          <p className="text-[11px] font-medium text-slate-500 dark:text-admin-text-secondary mt-0.5 transition-colors">
            Monitor real-time canteen, print jobs, and menus
          </p>
        </div>

        {/* Sleek, Sticky Horizontal Tab Bar */}
        <div className="sticky top-0 z-40 bg-white/95 dark:bg-admin-bg-surface/95 backdrop-blur-md border-b border-slate-200/80 dark:border-admin-border-subtle shadow-[0_2px_12px_rgba(0,0,0,0.02)] dark:shadow-none transition-colors">
          <div className="flex overflow-x-auto hide-scrollbar px-2">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setSearchParams({ tab: tab.id })}
                  className={`relative flex items-center justify-center gap-2 px-4 py-3.5 text-xs font-bold whitespace-nowrap transition-colors ${
                    isActive ? 'text-amber-600 dark:text-amber-500' : 'text-slate-500 dark:text-admin-text-secondary hover:text-slate-700 dark:hover:text-admin-text-primary'
                  }`}
                >
                  <Icon className={`w-4 h-4 stroke-[2.5] ${isActive ? 'text-amber-500' : 'text-slate-400 dark:text-admin-text-tertiary'} transition-colors`} />
                  <span>{tab.label}</span>
                  {isActive && (
                    <span className="absolute bottom-0 left-0 w-full h-0.5 bg-amber-500 rounded-t-full" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Main Content Area */}
        <div className="p-4 pt-5">
          {activeTab === 'canteen' && <AdminCanteenOrdersPage />}
          {activeTab === 'print' && <AdminPrintOrdersPage />}
          {activeTab === 'menu' && <AdminCanteenMenuPage />}
        </div>
      </div>

      {/* ── DESKTOP PC VIEWPORT ONLY ── */}
      <div className="hidden md:block space-y-6 font-sans">
        {/* Operations Header */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-syne text-xl font-extrabold text-text-primary tracking-tight">
              Shop Operations Hub
            </h2>
            <p className="text-xs text-text-secondary font-medium">
              Monitor real-time canteen orders, print jobs, and menu availability across all campus shops
            </p>
          </div>
        </div>

        {/* Primary Navigation Tabs */}
        <div className="bg-surface p-1.5 rounded-2xl border border-border-subtle flex items-center gap-1.5 overflow-x-auto hide-scrollbar shadow-[0_2px_16px_rgba(0,0,0,0.03)]">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSearchParams({ tab: tab.id })}
                className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all duration-200 ${
                  isActive
                    ? 'bg-amber-500 text-white shadow-xs'
                    : 'text-text-secondary hover:bg-surface-elevated hover:text-text-primary'
                }`}
              >
                <Icon
                  className={`w-4 h-4 stroke-[2] ${
                    isActive ? 'text-white' : 'text-text-secondary/70'
                  }`}
                />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Main Content Area */}
        <div className="pt-1 pb-12">
          {activeTab === 'canteen' && <AdminCanteenOrdersPage />}
          {activeTab === 'print' && <AdminPrintOrdersPage />}
          {activeTab === 'menu' && <AdminCanteenMenuPage />}
        </div>
      </div>
    </div>
  );
};
