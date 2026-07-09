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

      {/* Explanation Banner */}
      <div className="rounded-3xl border border-amber-200/80 bg-amber-50/40 p-5 md:p-6">
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

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        {/* Search Bar */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary/70" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search users by name or email to grant access..."
            className="w-full h-11 pl-11 pr-4 rounded-2xl border border-border-subtle bg-surface text-sm font-medium text-text-primary outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-500/10 transition-all placeholder:text-slate-400"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => { setFilterMode('admins'); setSearchQuery(''); }}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
              filterMode === 'admins' && !searchQuery
                ? 'bg-amber-500 text-white shadow-xs'
                : 'bg-surface border border-border-subtle text-text-secondary hover:bg-surface-elevated'
            }`}
          >
            Current Notice Admins
          </button>
          <button
            type="button"
            onClick={() => { setFilterMode('all'); }}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
              filterMode === 'all' || searchQuery
                ? 'bg-amber-500 text-white shadow-xs'
                : 'bg-surface border border-border-subtle text-text-secondary hover:bg-surface-elevated'
            }`}
          >
            Search All Users
          </button>
        </div>
      </div>

      {/* User List */}
      <div className="bg-surface rounded-3xl border border-border-subtle shadow-[0_2px_16px_rgba(0,0,0,0.04)] overflow-hidden">
        <div className="px-6 py-4 border-b border-border-subtle flex items-center justify-between">
          <h2 className="font-syne text-sm font-extrabold text-text-primary uppercase tracking-wider">
            {searchQuery ? `Search results (${users.length})` : filterMode === 'admins' ? `Authorized Notice Admins (${users.length})` : `Users (${users.length})`}
          </h2>
        </div>

        <div className="divide-y divide-slate-100">
          {isLoading && (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-6 h-6 animate-spin text-accent-amber" />
            </div>
          )}

          {!isLoading && users.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center px-6">
              <Users className="w-10 h-10 text-text-placeholder mb-3 stroke-[1.5]" />
              <p className="text-sm font-bold text-text-primary">No users found</p>
              <p className="text-xs text-text-secondary mt-1">
                {filterMode === 'admins' ? 'No users have been granted Notice Admin access yet. Search for a user above to grant access.' : 'Try searching for a different name or email.'}
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
                  className="px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/60 transition-colors"
                >
                  {/* User info */}
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-surface-elevated border border-border-subtle overflow-hidden shrink-0 flex items-center justify-center font-bold text-text-secondary text-sm">
                      {user.avatar_url ? (
                        <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        (user.name || user.email || 'U').charAt(0).toUpperCase()
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-bold text-text-primary truncate">
                          {user.name || user.email}
                        </p>
                        {user.is_notice_admin && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-accent-amber-soft text-accent-amber text-[10px] font-extrabold border border-accent-amber-soft">
                            <CheckCircle2 className="w-3 h-3" />
                            Notice Admin
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-text-secondary truncate mt-0.5">
                        {user.email} · <span className="font-semibold text-text-secondary">{studyYearText}</span> · {user.college || 'No college'}
                      </p>
                    </div>
                  </div>

                  {/* Toggle button */}
                  <div className="flex items-center gap-3 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleToggleNoticeAdmin(user)}
                      disabled={isToggling}
                      className={`h-9 px-4 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-2xs disabled:opacity-50 ${
                        user.is_notice_admin
                          ? 'bg-accent-red/15 border border-rose-200 text-accent-red hover:bg-rose-100'
                          : 'bg-amber-500 hover:bg-amber-600 text-white'
                      }`}
                    >
                      {isToggling ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : user.is_notice_admin ? (
                        <>
                          <UserX className="w-3.5 h-3.5" /> Revoke Access
                        </>
                      ) : (
                        <>
                          <UserCheck className="w-3.5 h-3.5" /> Grant Notice Admin
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
