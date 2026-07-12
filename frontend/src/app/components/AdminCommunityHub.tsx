import React from 'react';
import { useSearchParams } from 'react-router';
import { AdminCommunityPage } from './AdminCommunityPage';
import { AdminCommunityReportedPage } from './AdminCommunityReportedPage';
import { AdminCommunityNoticePage } from './AdminCommunityNoticePage';
import { AdminFinanceCreditsPage } from './AdminFinanceCreditsPage';
import { MessageSquare, Flag, Send, Zap } from 'lucide-react';

const tabs = [
  { id: 'posts', label: 'All Posts', icon: MessageSquare },
  { id: 'reported', label: 'Reported Posts', icon: Flag },
  { id: 'notice', label: 'Post Notice', icon: Send },
  { id: 'reputation', label: 'Reputation System', icon: Zap },
] as const;

export const AdminCommunityHub: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'posts';

  return (
    <div className="space-y-5 relative">
      {/* Header */}
      <div className="md:block hidden">
        <h2 className="font-syne text-xl font-extrabold text-slate-900 dark:text-admin-text-primary tracking-tight transition-colors">Community Hub</h2>
        <p className="text-sm text-slate-500 dark:text-admin-text-secondary mt-0.5 transition-colors">
          Manage community posts, reported content, campus notices and reputation
        </p>
      </div>

      {/* ── MOBILE VIEWPORT ONLY ── */}
      <div className="md:hidden sticky top-[64px] z-30 bg-slate-50/95 dark:bg-admin-bg-base/95 backdrop-blur-md pt-2 px-4 shadow-[0_4px_12px_rgba(0,0,0,0.02)] dark:shadow-none transition-colors">
        <div className="flex items-center gap-6 overflow-x-auto hide-scrollbar">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSearchParams({ tab: tab.id })}
                className={`relative flex items-center gap-1.5 pb-3 pt-2 text-[12px] font-extrabold whitespace-nowrap transition-colors ${
                  isActive ? 'text-amber-600 dark:text-amber-500' : 'text-slate-400 dark:text-admin-text-tertiary hover:text-slate-700 dark:hover:text-admin-text-primary'
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {tab.label}
                {isActive && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-500 rounded-t-full shadow-[0_-2px_6px_rgba(245,158,11,0.4)] dark:shadow-none transition-colors" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── DESKTOP PC VIEWPORT ONLY ── */}
      <div className="hidden md:flex items-center gap-1.5 bg-white dark:bg-admin-bg-surface border border-slate-200 dark:border-admin-border-subtle rounded-2xl p-1.5 overflow-x-auto hide-scrollbar shadow-sm dark:shadow-none transition-colors">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSearchParams({ tab: tab.id })}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-semibold whitespace-nowrap transition-all duration-150 ${
                isActive
                  ? 'bg-amber-500 dark:bg-admin-accent text-white dark:text-admin-bg-surface-elevated shadow-sm shadow-amber-200 dark:shadow-none'
                  : 'text-slate-500 dark:text-admin-text-secondary hover:bg-slate-100 dark:hover:bg-admin-bg-surface-hover hover:text-slate-800 dark:hover:text-admin-text-primary'
              }`}
            >
              <Icon className={`h-3.5 w-3.5 shrink-0 transition-colors ${isActive ? 'text-white dark:text-admin-bg-surface-elevated' : 'text-slate-400 dark:text-admin-text-tertiary'}`} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="pb-10">
        {activeTab === 'posts' && <AdminCommunityPage />}
        {activeTab === 'reported' && <AdminCommunityReportedPage />}
        {activeTab === 'notice' && <AdminCommunityNoticePage />}
        {activeTab === 'reputation' && <AdminFinanceCreditsPage />}
      </div>
    </div>
  );
};
