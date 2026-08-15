import React from 'react';
import { useSearchParams } from 'react-router';
import { AdminUsersPage } from './AdminUsersPage';
import { AdminProfessorsPage } from './AdminProfessorsPage';
import { AdminCanteensPage } from './AdminCanteensPage';
import { AdminBannedUsersPage } from './AdminBannedUsersPage';
import { AdminRolesPage } from './AdminRolesPage';
import { AdminInvitesPage } from './AdminInvitesPage';
import { AdminPrintShopsPage } from './AdminPrintShopsPage';
import { AdminProfessorsPendingPage } from './AdminProfessorsPendingPage';
import { AdminBatchPromotionPage } from './AdminBatchPromotionPage';
import { AdminBroadcastPushCard } from './AdminBroadcastPushCard';
import { Users, GraduationCap, Store, Ticket, Printer, Clock, Ban, Shield, ArrowUpCircle } from 'lucide-react';

const PRIMARY_TABS = [
  { id: 'users', label: 'Users & Roles', icon: Users },
  { id: 'professors', label: 'Professors', icon: GraduationCap },

  { id: 'canteens', label: 'Campus Shops', icon: Store },
] as const;

const SUB_TABS: Record<string, { id: string; label: string; icon?: React.ElementType }[]> = {
  users: [
    { id: 'users',     label: 'All Users',       icon: Users },
    { id: 'banned',    label: 'Banned Accounts', icon: Ban },
    { id: 'roles',     label: 'Role Permissions',icon: Shield },
    { id: 'invites',   label: 'Invitations',     icon: Ticket },
    { id: 'promotion', label: 'Batch Promotion', icon: ArrowUpCircle },
  ],
  professors: [
    { id: 'professors', label: 'All Professors', icon: GraduationCap },
    { id: 'professors_pending', label: 'Pending Approvals', icon: Clock },
  ],

  canteens: [
    { id: 'canteens', label: 'Canteen Shops', icon: Store },
    { id: 'print', label: 'Print Shops', icon: Printer },
  ],
};

export const AdminAccountsHub: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = (searchParams.get('tab') || 'users') as keyof typeof SUB_TABS;
  const currentSubTabs = SUB_TABS[activeTab] || [];
  const activeSubTab = searchParams.get('subtab') || currentSubTabs[0]?.id || 'users';

  const setTab = (tab: string) => {
    const defaultSub = SUB_TABS[tab as keyof typeof SUB_TABS]?.[0]?.id || tab;
    setSearchParams({ tab, subtab: defaultSub });
  };

  const setSubTab = (subtab: string) => {
    setSearchParams({ tab: activeTab, subtab });
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="transition-colors">
        <h2 className="font-syne text-xl font-extrabold text-slate-900 dark:text-admin-text-primary tracking-tight transition-colors">
          Accounts &amp; Access Directory
        </h2>
        <p className="text-sm text-slate-500 dark:text-admin-text-secondary mt-0.5 transition-colors">
          Manage user roles, professor approvals, campus shops, and moderation policies
        </p>
      </div>

      {/* Primary Tab Bar */}
      <div className="flex items-center gap-1.5 bg-white dark:bg-admin-bg-surface border border-slate-200 dark:border-admin-border-subtle rounded-2xl p-1.5 overflow-x-auto hide-scrollbar shadow-sm dark:shadow-none transition-colors">
        {PRIMARY_TABS.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-semibold whitespace-nowrap transition-all duration-150 ${
                isActive
                  ? 'bg-amber-500 text-white shadow-sm shadow-amber-200 dark:bg-admin-accent dark:text-admin-bg-surface-elevated dark:shadow-none'
                  : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:text-admin-text-secondary dark:hover:bg-admin-bg-surface-hover dark:hover:text-admin-text-primary'
              }`}
            >
              <Icon className={`h-3.5 w-3.5 shrink-0 transition-colors ${isActive ? 'text-white dark:text-admin-bg-surface-elevated' : 'text-slate-400 dark:text-admin-text-tertiary group-hover:text-admin-text-primary'}`} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Secondary Sub-Tab Row */}
      {currentSubTabs.length > 1 && (
        <div className="flex items-center gap-2 flex-wrap">
          {currentSubTabs.map(sub => {
            const isActive = activeSubTab === sub.id;
            const Icon = sub.icon;
            return (
              <button
                key={sub.id}
                type="button"
                onClick={() => setSubTab(sub.id)}
                className={`inline-flex items-center gap-1.5 rounded-xl border px-3.5 py-1.5 text-[12px] font-semibold transition-all ${
                  isActive
                    ? 'border-slate-900 bg-slate-900 text-white shadow-sm dark:border-admin-border-strong dark:bg-admin-border-strong dark:text-admin-text-primary dark:shadow-none'
                    : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:text-slate-800 dark:border-admin-border-subtle dark:bg-admin-bg-surface dark:text-admin-text-secondary dark:hover:border-admin-border-strong dark:hover:text-admin-text-primary'
                }`}
              >
                {Icon && <Icon size={12} className={isActive ? 'text-white dark:text-admin-text-primary' : 'text-slate-400 dark:text-admin-text-tertiary'} />}
                {sub.label}
              </button>
            );
          })}
        </div>
      )}

      {/* Content Area */}
      <div className="pb-6">
        {activeSubTab === 'users'     && <AdminUsersPage />}
        {activeSubTab === 'professors' && <AdminProfessorsPage />}
        {activeSubTab === 'professors_pending' && <AdminProfessorsPendingPage />}

        {activeSubTab === 'canteens'  && <AdminCanteensPage />}
        {activeSubTab === 'print'     && <AdminPrintShopsPage />}
        {activeSubTab === 'roles'     && <AdminRolesPage />}
        {activeSubTab === 'banned'    && <AdminBannedUsersPage />}
        {activeSubTab === 'invites'   && <AdminInvitesPage />}
        {activeSubTab === 'promotion' && <AdminBatchPromotionPage />}
      </div>

      {/* ── Broadcast Push Card — always visible at the bottom ───────────── */}
      {/* Follows DESIGN.md: white canvas, hairline border, 18px radius, no card shadow */}
      <div className="pb-10">
        <AdminBroadcastPushCard />
      </div>
    </div>
  );
};
