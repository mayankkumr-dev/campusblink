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
import { AdminSocietiesPage } from './AdminSocietiesPage';
import { Users, GraduationCap, Store, ShieldAlert, Ban, Ticket, Printer, Clock } from 'lucide-react';

export const AdminAccountsHub: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'users';

  const tabs = [
    { id: 'users', label: 'Users & Roles', icon: Users },
    { id: 'professors', label: 'Professors', icon: GraduationCap },
    { id: 'societies', label: 'Societies', icon: Users },
    { id: 'canteens', label: 'Campus Shops', icon: Store },
  ] as const;

  const subTabs = {
    users: [
      { id: 'users', label: 'All Users' },
      { id: 'banned', label: 'Banned' },
      { id: 'roles', label: 'Roles' },
      { id: 'invites', label: 'Invites' },
    ],
    professors: [
      { id: 'professors', label: 'All Professors' },
      { id: 'professors_pending', label: 'Pending Approvals' },
    ],
    societies: [
      { id: 'societies', label: 'All Societies' },
    ],
    canteens: [
      { id: 'canteens', label: 'Canteen Shops' },
      { id: 'print', label: 'Print Shops' },
    ]
  };

  const currentSubTabs = subTabs[activeTab as keyof typeof subTabs] || [];
  const activeSubTab = searchParams.get('subtab') || currentSubTabs[0]?.id || 'users';

  return (
    <div className="space-y-4">
      {/* Primary Scrollable Tabs */}
      <div className="bg-[var(--bg)] p-2 rounded-lg border border-black/[0.08] flex items-center gap-2 overflow-x-auto hide-scrollbar sticky top-0 z-10 shadow-sm">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setSearchParams({ tab: tab.id, subtab: subTabs[tab.id as keyof typeof subTabs][0].id })}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-md text-sm font-bold whitespace-nowrap transition-all duration-200 ${
                isActive 
                  ? 'bg-[var(--yellow)] text-[var(--text)] shadow-sm' 
                  : 'text-[var(--text-secondary)] hover:bg-black/5 hover:text-[var(--text)]'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-[var(--text)]' : 'text-[var(--text-secondary)]'}`} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Secondary Sub-Tabs */}
      {currentSubTabs.length > 1 && (
        <div className="flex border-b border-black/[0.08] mb-4 overflow-x-auto hide-scrollbar">
          {currentSubTabs.map(subtab => {
            const isSubActive = activeSubTab === subtab.id;
            return (
              <button
                key={subtab.id}
                onClick={() => setSearchParams({ tab: activeTab, subtab: subtab.id })}
                className={`py-2 px-4 text-[13px] font-bold whitespace-nowrap border-b-2 transition-colors ${
                  isSubActive 
                    ? 'border-black text-[var(--text)]' 
                    : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text)] hover:border-black/30'
                }`}
              >
                {subtab.label}
              </button>
            );
          })}
        </div>
      )}

      {/* Content Area */}
      <div className="pt-2 pb-10">
        {activeSubTab === 'users' && <AdminUsersPage />}
        {activeSubTab === 'professors' && <AdminProfessorsPage />}
        {activeSubTab === 'professors_pending' && <AdminProfessorsPendingPage />}
        {activeSubTab === 'societies' && <AdminSocietiesPage />}
        {activeSubTab === 'canteens' && <AdminCanteensPage />}
        {activeSubTab === 'print' && <AdminPrintShopsPage />}
        {activeSubTab === 'roles' && <AdminRolesPage />}
        {activeSubTab === 'banned' && <AdminBannedUsersPage />}
        {activeSubTab === 'invites' && <AdminInvitesPage />}
      </div>
    </div>
  );
};
