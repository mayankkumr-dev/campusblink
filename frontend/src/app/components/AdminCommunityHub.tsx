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
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h2 className="font-syne text-xl font-extrabold text-slate-900 tracking-tight">Community Hub</h2>
        <p className="text-sm text-slate-500 mt-0.5">
          Manage community posts, reported content, campus notices and reputation
        </p>
      </div>

      {/* Primary Tab Navigation */}
      <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-2xl p-1.5 overflow-x-auto hide-scrollbar shadow-sm">
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
                  ? 'bg-amber-500 text-white shadow-sm shadow-amber-200'
                  : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'
              }`}
            >
              <Icon className={`h-3.5 w-3.5 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
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
