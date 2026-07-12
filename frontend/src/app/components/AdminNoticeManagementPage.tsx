import React, { useCallback, useEffect, useState } from 'react';
import {
  Search,
  Megaphone,
  UserCheck,
  UserX,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Users,
  ShieldCheck,
  ArrowRight,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { setNoticeAdminPermission } from '../../api/notices';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../store/authStore';

export const AdminNoticeManagementPage: React.FC = () => {
  const profile = useAuthStore((state) => state.profile);
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [filterMode, setFilterMode] = useState<'all' | 'admins'>('admins');

  const loadUsers = useCallback(async () => {
    setIsLoading(true);
    let query = supabase
      .from('profiles')
      .select('id, name, email, college, study_year, role, is_notice_admin, avatar_url')
      .order('is_notice_admin', { ascending: false })
      .order('name', { ascending: true })
      .limit(60);

    if (searchQuery.trim()) {
      query = query.or(`name.ilike.%${searchQuery.trim()}%,email.ilike.%${searchQuery.trim()}%`);
    } else if (filterMode === 'admins') {
      query = query.eq('is_notice_admin', true);
    }

    const { data, error } = await query;
    if (error) {
      toast.error('Could not load users');
    } else {
      setUsers(data || []);
    }
    setIsLoading(false);
  }, [searchQuery, filterMode]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadUsers();
    }, 250);
    return () => clearTimeout(timer);
  }, [loadUsers]);

  const handleToggleNoticeAdmin = async (user: any) => {
    const nextVal = !user.is_notice_admin;
    setTogglingId(user.id);
    const { error } = await setNoticeAdminPermission(user.id, nextVal);
    setTogglingId(null);

    if (error) {
      toast.error('Failed to update notice admin permission');
      return;
    }

    toast.success(
      nextVal
        ? `Granted Notice Admin access to ${user.name || user.email}`
        : `Revoked Notice Admin access from ${user.name || user.email}`
    );

    setUsers((prev) =>
      prev.map((u) => (u.id === user.id ? { ...u, is_notice_admin: nextVal } : u))
    );
  };

  return (
    <div className="space-y-8 pb-12 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500 flex items-center justify-center text-white">
              <Megaphone className="w-4 h-4" />
            </div>
            <span className="text-[11px] font-bold text-accent-amber uppercase tracking-widest">
              Access Control
            </span>
          </div>
          <h1 className="font-syne text-2xl md:text-3xl font-extrabold text-text-primary">
            Notice Admins Management
          </h1>
          <p className="text-sm text-text-secondary mt-1 max-w-xl">
            Grant or revoke permission for specific people to post Official Notices across all 4 study years or specifically to their audience.
          </p>
        </div>
      </div>

      {/* ── DESKTOP PC VIEWPORT ONLY ── */}
      <div className="hidden md:block rounded-3xl border border-amber-200/80 bg-amber-50/40 p-5 md:p-6">
        <div className="flex items-start gap-4">
          <ShieldCheck className="w-6 h-6 text-accent-amber shrink-0 mt-0.5" />
          <div className="text-xs sm:text-sm text-text-primary leading-relaxed space-y-1.5">
            <p className="font-bold text-text-primary">How Notice Admin access works:</p>
            <ul className="list-disc list-inside space-y-1 text-text-secondary">
              <li>
                When you grant <strong>Notice Admin</strong> status to any user, a dedicated <strong>"Notice Admin"</strong> panel automatically appears in their <strong>Settings</strong> page.
              </li>
              <li>
                Authorized notice admins can compose notices targeted to <strong>All Students</strong> or specifically to <strong>1st Year, 2nd Year, 3rd Year, or 4th Year</strong> students.
              </li>
              <li>
                They can upload attachments including <strong>PDFs, images, Word docs, spreadsheets, and presentations</strong> up to 25 MB.
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* ── MOBILE VIEWPORT ONLY ── */}
      <div className="md:hidden rounded-xl border border-amber-200 dark:border-amber-500/20 bg-amber-50 dark:bg-amber-500/10 p-4 font-sans text-xs font-semibold text-amber-900 dark:text-amber-500 shadow-[0_2px_10px_rgba(0,0,0,0.02)] dark:shadow-none flex gap-3 items-start transition-colors">
        <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5 dark:text-amber-400 transition-colors" />
        <div>
          <p className="font-bold text-sm mb-0.5">Notice Admin Access</p>
          <p className="text-amber-700/80 dark:text-amber-400/90 transition-colors">Authorized users get a "Notice Admin" panel to publish official notices with attachments.</p>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="sticky top-[64px] z-30 bg-background/95 backdrop-blur-md pt-2 pb-4 -mx-4 px-4 md:static md:bg-transparent md:p-0 md:mx-0 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        {/* Search Bar */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary/70" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search users by name or email..."
            className="w-full h-11 pl-11 pr-4 rounded-2xl border border-border-subtle bg-surface text-sm font-medium text-text-primary outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-500/10 transition-all placeholder:text-slate-400 shadow-[0_2px_12px_rgba(0,0,0,0.02)]"
          />
        </div>

        {/* Filter Pills (Toggle Switch on Mobile) */}
        <div className="flex items-center gap-1.5 bg-slate-100/80 dark:bg-admin-bg-surface p-1.5 rounded-xl border border-slate-200/50 dark:border-admin-border-subtle transition-colors">
          <button
            type="button"
            onClick={() => { setFilterMode('admins'); setSearchQuery(''); }}
            className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              filterMode === 'admins' && !searchQuery
                ? 'bg-white text-amber-600 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Admins
          </button>
          <button
            type="button"
            onClick={() => { setFilterMode('all'); }}
            className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              filterMode === 'all' || searchQuery
                ? 'bg-white text-amber-600 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            All Users
          </button>
        </div>
      </div>

      {/* User List */}
      <div className="md:bg-surface md:rounded-3xl md:border md:border-border-subtle md:shadow-[0_2px_16px_rgba(0,0,0,0.04)] overflow-hidden">
        <div className="hidden md:flex px-6 py-4 border-b border-border-subtle items-center justify-between">
          <h2 className="font-syne text-sm font-extrabold text-text-primary uppercase tracking-wider">
            {searchQuery ? `Search results (${users.length})` : filterMode === 'admins' ? `Authorized Notice Admins (${users.length})` : `Users (${users.length})`}
          </h2>
        </div>

        <div className="md:divide-y md:divide-slate-100 flex flex-col gap-3 md:gap-0">
          {isLoading && (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-6 h-6 animate-spin text-accent-amber" />
            </div>
          )}

          {!isLoading && users.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center px-6 bg-white md:bg-transparent rounded-2xl md:rounded-none border md:border-0 border-slate-100">
              <Users className="w-10 h-10 text-text-placeholder mb-3 stroke-[1.5]" />
              <p className="text-sm font-bold text-text-primary">No users found</p>
              <p className="text-xs text-text-secondary mt-1 max-w-[250px]">
                {filterMode === 'admins' ? 'No users have been granted Notice Admin access yet.' : 'Try searching for a different name or email.'}
              </p>
            </div>
          )}

          {!isLoading &&
            users.map((user) => {
              const isToggling = togglingId === user.id;
              const studyYearText = user.study_year ? user.study_year.split(':')[0].trim() : 'Campus Member';

              return (
                <div
                  key={user.id}
                  className="bg-white md:bg-transparent rounded-2xl md:rounded-none border border-slate-100 md:border-0 p-4 md:px-6 md:py-4 flex flex-row items-center justify-between gap-3 shadow-[0_2px_12px_rgba(0,0,0,0.02)] md:shadow-none hover:bg-slate-50/60 transition-colors"
                >
                  {/* User info */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 md:w-11 md:h-11 rounded-full bg-slate-50 border border-slate-100 overflow-hidden shrink-0 flex items-center justify-center font-bold text-slate-400 text-sm">
                      {user.avatar_url ? (
                        <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        (user.name || user.email || 'U').charAt(0).toUpperCase()
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-bold text-slate-900 truncate">
                          {user.name || user.email}
                        </p>
                      </div>
                      <p className="text-[10px] md:text-xs font-semibold text-slate-500 truncate mt-0.5 uppercase tracking-wider">
                        {studyYearText} · {user.college || 'No college'}
                      </p>
                      {user.is_notice_admin && (
                        <div className="mt-1">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded border border-amber-200 bg-amber-50 text-amber-600 text-[9px] font-extrabold uppercase tracking-wider">
                            <CheckCircle2 className="w-3 h-3" />
                            Notice Admin
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Toggle button */}
                  <div className="shrink-0">
                    <button
                      type="button"
                      onClick={() => handleToggleNoticeAdmin(user)}
                      disabled={isToggling}
                      className={`h-9 px-3 md:px-4 rounded-xl text-[11px] md:text-xs font-bold flex items-center justify-center gap-1.5 transition-all disabled:opacity-50 ${
                        user.is_notice_admin
                          ? 'bg-rose-50 text-rose-600 hover:bg-rose-100'
                          : 'bg-amber-50 text-amber-600 hover:bg-amber-100'
                      }`}
                    >
                      {isToggling ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : user.is_notice_admin ? (
                        <>
                          <UserX className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Revoke</span>
                        </>
                      ) : (
                        <>
                          <UserCheck className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Grant</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
};
