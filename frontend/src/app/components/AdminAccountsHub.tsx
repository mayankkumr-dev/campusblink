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
      { id: 'banned', label: 'Banned Accounts' },
      { id: 'roles', label: 'Role Permissions' },
      { id: 'invites', label: 'Invitations' },
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
    <div className="space-y-6 font-sans">
      {/* Top Controls Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-syne text-xl font-extrabold text-slate-900 tracking-tight">
            Accounts &amp; Access Directory
          </h2>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Manage user roles, professor approvals, campus shops, and moderation policies
          </p>
        </div>
      </div>

      {/* Primary Scrollable Pills Container */}
      <div className="bg-white p-1.5 rounded-2xl border border-slate-100 flex items-center gap-1.5 overflow-x-auto hide-scrollbar shadow-[0_2px_16px_rgba(0,0,0,0.03)]">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() =>
                setSearchParams({
                  tab: tab.id,
                  subtab: subTabs[tab.id as keyof typeof subTabs][0].id,
                })
              }
              className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all duration-200 ${
                isActive
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <Icon
                className={`w-4 h-4 stroke-[2] ${
                  isActive ? 'text-white' : 'text-slate-400'
                }`}
              />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Secondary Pill Sub-Tabs */}
      {currentSubTabs.length > 1 && (
        <div className="flex items-center gap-2 border-b border-slate-100 pb-4 overflow-x-auto hide-scrollbar">
          {currentSubTabs.map((subtab) => {
            const isSubActive = activeSubTab === subtab.id;
            return (
              <button
                key={subtab.id}
                type="button"
                onClick={() => setSearchParams({ tab: activeTab, subtab: subtab.id })}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  isSubActive
                    ? 'bg-slate-900 text-white shadow-2xs'
                    : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'
                }`}
              >
                {subtab.label}
              </button>
            );
          })}
        </div>
      )}

      {/* Dynamic Subpage Content Area */}
      <div className="pt-1 pb-12">
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
