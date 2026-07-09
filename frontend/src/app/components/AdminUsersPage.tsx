import React, { useState, useEffect } from 'react';
import {
  Search,
  Filter,
  Download,
  MoreVertical,
  Shield,
  ShieldAlert,
  Ban,
  UserX,
  Edit3,
  Trash2,
  CheckCircle2,
  Loader2,
  Star,
} from 'lucide-react';
import { useNavigate } from 'react-router';
import {
  getAllUsers,
  updateUserStatus,
  changeUserRole,
  permanentlyDeleteUser,
} from '../../api/admin';
import { useAuthStore } from '../../store/authStore';
import { getAvatarDataUrl } from '../../lib/avatar';
import toast from 'react-hot-toast';
import { FEATURE_ACCESS_ITEMS, bulkUpdateUserRestrictions } from '../../api/featureAccess';
import { supabase } from '../../lib/supabase';

export const AdminUsersPage: React.FC = () => {
  const navigate = useNavigate();
  const adminProfile = useAuthStore((state) => state.profile);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [users, setUsers] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);

  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [bulkFeature, setBulkFeature] = useState(FEATURE_ACCESS_ITEMS[0]?.key || 'search');
  const [bulkReason, setBulkReason] = useState('');
  const [bulkMode, setBulkMode] = useState<'disable' | 'enable'>('disable');

  useEffect(() => {
    fetchUsers();
  }, [searchTerm, filterRole, page]);

  useEffect(() => {
    const channel = supabase
      .channel('admin-users-page')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => {
        fetchUsers();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [searchTerm, filterRole, page]);

  const fetchUsers = async () => {
    setIsLoading(true);
    const { data, count } = await getAllUsers({ searchTerm, role: filterRole }, page);
    if (data) setUsers(data);
    if (count !== null) setTotalCount(count);
    setIsLoading(false);
  };

  const toggleSelectAll = () => {
    if (selectedUsers.length === users.length) setSelectedUsers([]);
    else setSelectedUsers(users.map((u) => u.id));
  };

  const toggleSelectUser = (id: string) => {
    if (selectedUsers.includes(id))
      setSelectedUsers(selectedUsers.filter((userId) => userId !== id));
    else setSelectedUsers([...selectedUsers, id]);
  };

  const handleUpdateStatus = async (userId: string, status: string, name: string) => {
    if (!adminProfile) return;
    const loadingToast = toast.loading(`Updating status for ${name}...`);
    const { error } = await updateUserStatus(
      adminProfile.id,
      userId,
      status,
      `Admin action: ${status}`
    );
    if (error) {
      toast.error(error.message, { id: loadingToast });
    } else {
      toast.success(`${name} is now ${status}`, { id: loadingToast });
      fetchUsers();
    }
    setActiveDropdown(null);
  };

  const handleChangeRole = async (userId: string, newRole: string, name: string) => {
    if (!adminProfile) return;
    const loadingToast = toast.loading(`Changing role for ${name}...`);
    const { error } = await changeUserRole(adminProfile.id, userId, newRole);
    if (error) {
      toast.error(error.message, { id: loadingToast });
    } else {
      toast.success(`${name} is now ${newRole}`, { id: loadingToast });
      fetchUsers();
    }
    setActiveDropdown(null);
  };

  const handlePermanentDelete = async (userId: string, userName: string) => {
    if (!adminProfile) return;
    const confirmed = window.confirm(
      `Are you absolutely sure you want to PERMANENTLY DELETE ${userName} from the database and storage?\n\nThis removes their account, profile data, auth record, and images. THIS CANNOT BE UNDONE.`
    );
    if (!confirmed) return;

    const loadingToast = toast.loading(`Deleting ${userName}...`);
    const { error } = await permanentlyDeleteUser(adminProfile.id, userId);

    if (error) {
      toast.error(error.message || 'Failed to permanently delete user', { id: loadingToast });
    } else {
      toast.success(`${userName} permanently deleted`, { id: loadingToast });
      fetchUsers();
    }
    setActiveDropdown(null);
  };

  const handleBulkRestrict = async () => {
    if (!adminProfile || selectedUsers.length === 0) return;
    const loadingToast = toast.loading(`Applying bulk feature update...`);
    const { error } = await bulkUpdateUserRestrictions(
      selectedUsers,
      bulkFeature,
      bulkMode === 'disable',
      adminProfile.id,
      bulkReason || `Bulk ${bulkMode} via Admin Console`
    );
    if (error) {
      toast.error('Bulk update failed', { id: loadingToast });
    } else {
      toast.success(`Successfully updated ${selectedUsers.length} users`, { id: loadingToast });
      setSelectedUsers([]);
      fetchUsers();
    }
  };

  const RoleBadge = ({ role }: { role: string }) => {
    const badges: Record<string, { bg: string; text: string; label: string }> = {
      admin: { bg: 'bg-amber-50 border-amber-200', text: 'text-amber-800', label: 'Super Admin' },
      professor: { bg: 'bg-purple-50 border-purple-200', text: 'text-purple-700', label: 'Professor' },
      canteen_owner: {
        bg: 'bg-orange-50 border-orange-200',
        text: 'text-orange-700',
        label: 'Canteen Owner',
      },
      print_shop: {
        bg: 'bg-blue-50 border-blue-200',
        text: 'text-blue-700',
        label: 'Print Shop',
      },
      student: {
        bg: 'bg-slate-50 border-slate-200',
        text: 'text-slate-700',
        label: 'Student',
      },
    };

    const b = badges[role] || badges.student;
    return (
      <span
        className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${b.bg} ${b.text}`}
      >
        {b.label}
      </span>
    );
  };

  const StatusBadge = ({ status }: { status: string }) => {
    const statuses: Record<string, { bg: string; text: string; label: string }> = {
      active: {
        bg: 'bg-emerald-50 border-emerald-200',
        text: 'text-emerald-700',
        label: 'Active',
      },
      restricted: {
        bg: 'bg-amber-50 border-amber-200',
        text: 'text-amber-700',
        label: 'Restricted',
      },
      banned: {
        bg: 'bg-rose-50 border-rose-200',
        text: 'text-rose-700',
        label: 'Banned',
      },
    };

    const s = statuses[status] || statuses.active;
    return (
      <span
        className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${s.bg} ${s.text}`}
      >
        <span
          className={`h-1.5 w-1.5 rounded-full ${
            status === 'active'
              ? 'bg-emerald-500'
              : status === 'banned'
              ? 'bg-rose-500'
              : 'bg-amber-500'
          }`}
        />
        {s.label}
      </span>
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300 font-sans">
      {/* Top Search and Filters Bar */}
      <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-4 bg-white p-5 rounded-3xl border border-slate-100 shadow-[0_2px_16px_rgba(0,0,0,0.03)]">
        {/* Search Input */}
        <div className="relative w-full lg:w-96 group">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-amber-500 transition-colors" />
          <input
            type="text"
            placeholder="Search name, email, college, roll number..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setPage(1);
            }}
            className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-2.5 pl-10 pr-4 text-xs font-semibold text-slate-900 placeholder-slate-400 focus:outline-none focus:border-amber-400 focus:bg-white transition-all shadow-2xs"
          />
        </div>

        {/* Role Pills & Export */}
        <div className="flex flex-wrap items-center gap-2">
          {['all', 'student', 'canteen_owner', 'print_shop', 'admin'].map((pill) => (
            <button
              key={pill}
              type="button"
              onClick={() => {
                setFilterRole(pill);
                setPage(1);
              }}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all capitalize ${
                filterRole === pill
                  ? 'bg-amber-500 text-white shadow-2xs'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-slate-200/80'
              }`}
            >
              {pill.replace('_', ' ')}
            </button>
          ))}
          <div className="h-6 w-px bg-slate-200 mx-2 hidden lg:block" />
          <button
            type="button"
            className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition-colors shadow-2xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Bulk Actions Banner */}
      {selectedUsers.length > 0 && (
        <div className="bg-amber-50/80 border border-amber-200 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 animate-in slide-in-from-top-3">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-amber-900 font-bold text-xs">
              {selectedUsers.length} user{selectedUsers.length > 1 ? 's' : ''} selected
            </span>
            <select
              value={bulkFeature}
              onChange={(event) => setBulkFeature(event.target.value)}
              className="rounded-xl border border-amber-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-900"
            >
              {FEATURE_ACCESS_ITEMS.map((item) => (
                <option key={item.key} value={item.key}>
                  {item.label}
                </option>
              ))}
            </select>
            <select
              value={bulkMode}
              onChange={(event) => setBulkMode(event.target.value as 'disable' | 'enable')}
              className="rounded-xl border border-amber-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-900"
            >
              <option value="disable">Disable</option>
              <option value="enable">Enable</option>
            </select>
            <input
              value={bulkReason}
              onChange={(event) => setBulkReason(event.target.value)}
              placeholder="Reason (optional)"
              className="w-56 rounded-xl border border-amber-200 bg-white px-3 py-1.5 text-xs text-slate-900 placeholder-slate-400"
            />
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleBulkRestrict}
              className="px-3.5 py-1.5 bg-amber-500 text-white hover:bg-amber-600 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 shadow-2xs"
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>{bulkMode === 'disable' ? 'Disable Selected' : 'Enable Selected'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Refined User Directory Table */}
      <div className="bg-white border border-slate-100 rounded-3xl overflow-hidden shadow-[0_2px_16px_rgba(0,0,0,0.03)] min-h-[420px]">
        {isLoading ? (
          <div className="flex h-72 items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70">
                  <th className="py-3.5 px-4 w-12 text-center">
                    <input
                      type="checkbox"
                      checked={selectedUsers.length === users.length && users.length > 0}
                      onChange={toggleSelectAll}
                      className="rounded bg-white border-slate-300 text-amber-500 focus:ring-amber-500"
                    />
                  </th>
                  <th className="py-3.5 px-4 text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">
                    User Account
                  </th>
                  <th className="py-3.5 px-4 text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">
                    Contact &amp; College
                  </th>
                  <th className="py-3.5 px-4 text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">
                    Assigned Role
                  </th>
                  <th className="py-3.5 px-4 text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">
                    Reputation
                  </th>
                  <th className="py-3.5 px-4 text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">
                    Account Status
                  </th>
                  <th className="py-3.5 px-4 w-16 text-center text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((user) => (
                  <tr
                    key={user.id}
                    className="hover:bg-slate-50/80 transition-colors group"
                  >
                    <td className="py-4 px-4 text-center">
                      <input
                        type="checkbox"
                        checked={selectedUsers.includes(user.id)}
                        onChange={() => toggleSelectUser(user.id)}
                        className="rounded bg-white border-slate-300 text-amber-500 focus:ring-amber-500"
                      />
                    </td>
                    <td className="py-4 px-4 min-w-[220px]">
                      <div className="flex items-center gap-3.5">
                        <div className="w-10 h-10 rounded-2xl bg-slate-100 flex items-center justify-center font-syne font-bold text-slate-700 shrink-0 overflow-hidden border border-slate-200">
                          <img
                            src={
                              user.avatar_url ||
                              getAvatarDataUrl({
                                name: user.name,
                                email: user.email,
                                seed: user.id || user.username,
                              })
                            }
                            alt={user.name || 'User'}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div>
                          <div className="font-sans font-bold text-xs text-slate-900">
                            {user.name || 'Unnamed'}
                          </div>
                          <div className="font-sans text-[11px] text-slate-500 font-medium mt-0.5">
                            @{user.username || 'user'}
                          </div>
                          <div className="font-sans text-[10px] text-slate-400">
                            Joined {new Date(user.created_at).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="font-sans text-xs font-semibold text-slate-800">
                        {user.email}
                      </div>
                      <div className="font-sans text-[11px] text-slate-500 font-bold mt-0.5">
                        {user.college || 'No college'}
                      </div>
                      {user.role === 'professor' || user.requested_role === 'teacher' ? (
                        user.staff_room_number ? (
                          <div className="font-sans text-[10px] text-slate-400">
                            Room: {user.staff_room_number}
                          </div>
                        ) : null
                      ) : (
                        <div className="font-sans text-[10px] text-slate-400">
                          {[user.study_year?.split(':')[0], user.branch]
                            .filter(Boolean)
                            .join(' • ')}
                        </div>
                      )}
                    </td>
                    <td className="py-4 px-4">
                      <RoleBadge role={user.role || 'student'} />
                    </td>
                    <td className="py-4 px-4">
                      <div className="inline-flex items-center gap-1.5 rounded-xl bg-amber-50 border border-amber-100 px-2.5 py-1 text-xs font-bold text-amber-700">
                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
                        <span>{(user.campus_credits || 0).toLocaleString()}</span>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <StatusBadge status={user.status || 'active'} />
                    </td>
                    <td className="py-4 px-4 text-center relative">
                      <button
                        type="button"
                        onClick={() =>
                          setActiveDropdown(activeDropdown === user.id ? null : user.id)
                        }
                        className="p-2 rounded-xl text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors"
                        aria-label="Manage user actions"
                      >
                        <MoreVertical className="w-4.5 h-4.5" />
                      </button>

                      {/* Actions Dropdown */}
                      {activeDropdown === user.id && (
                        <div className="absolute right-12 top-4 w-52 bg-white border border-slate-200 rounded-2xl shadow-xl z-30 py-1.5 font-sans text-xs overflow-hidden text-left animate-in zoom-in-95 duration-150">
                          <div className="px-3.5 py-2 border-b border-slate-100">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                              Account Action
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => navigate(`/admin/users/${user.id}`)}
                            className="w-full text-left px-4 py-2 text-slate-700 hover:bg-slate-50 flex items-center gap-2 font-semibold"
                          >
                            <Edit3 className="w-3.5 h-3.5 text-amber-500" />
                            <span>Open details</span>
                          </button>

                          <div className="h-px bg-slate-100 my-1" />
                          <div className="px-3.5 py-1.5">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                              Change Role
                            </span>
                          </div>
                          {['student', 'canteen_owner', 'print_shop', 'professor', 'admin'].map(
                            (r) =>
                              user.role !== r && (
                                <button
                                  key={r}
                                  type="button"
                                  onClick={() => handleChangeRole(user.id, r, user.name)}
                                  className="w-full text-left px-4 py-1.5 text-slate-700 hover:bg-slate-50 flex items-center gap-2 capitalize font-medium"
                                >
                                  <ShieldAlert className="w-3.5 h-3.5 text-amber-500" />
                                  <span>Make {r.replace('_', ' ')}</span>
                                </button>
                              )
                          )}

                          <div className="h-px bg-slate-100 my-1" />
                          <div className="px-3.5 py-1.5">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                              Moderation Status
                            </span>
                          </div>

                          {user.status !== 'active' && (
                            <button
                              type="button"
                              onClick={() => handleUpdateStatus(user.id, 'active', user.name)}
                              className="w-full text-left px-4 py-2 text-emerald-600 hover:bg-emerald-50 flex items-center gap-2 font-bold"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Unban / Activate</span>
                            </button>
                          )}
                          {user.status !== 'restricted' && (
                            <button
                              type="button"
                              onClick={() =>
                                handleUpdateStatus(user.id, 'restricted', user.name)
                              }
                              className="w-full text-left px-4 py-2 text-amber-700 hover:bg-amber-50 flex items-center gap-2 font-semibold"
                            >
                              <Ban className="w-3.5 h-3.5" />
                              <span>Restrict Account</span>
                            </button>
                          )}
                          {user.status !== 'banned' && (
                            <button
                              type="button"
                              onClick={() => handleUpdateStatus(user.id, 'banned', user.name)}
                              className="w-full text-left px-4 py-2 text-rose-600 hover:bg-rose-50 flex items-center gap-2 font-bold"
                            >
                              <UserX className="w-3.5 h-3.5" />
                              <span>Ban Account</span>
                            </button>
                          )}
                          <div className="h-px bg-slate-100 my-1" />
                          <button
                            type="button"
                            onClick={() => handlePermanentDelete(user.id, user.name)}
                            className="w-full text-left px-4 py-2 text-rose-600 hover:bg-rose-50 flex items-center gap-2 font-bold"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Permanently Delete</span>
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-16 text-center text-slate-400 text-xs font-semibold">
                      No users found matching your search or role filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Controls */}
        <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-slate-500">
          <span>
            Showing {users.length > 0 ? (page - 1) * 20 + 1 : 0}-
            {Math.min(page * 20, totalCount)} of {totalCount} users
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page === 1}
              onClick={() => setPage(page - 1)}
              className="px-3.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed font-bold"
            >
              Previous
            </button>
            <button
              type="button"
              disabled={page * 20 >= totalCount}
              onClick={() => setPage(page + 1)}
              className="px-3.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed font-bold"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
