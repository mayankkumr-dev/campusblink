import React, { useState, useEffect } from 'react';
import { 
  Search, Filter, Download, MoreVertical, Shield, ShieldAlert,
  Ban, UserX, Mail, Zap, Edit3, Trash2, CheckCircle2, AlertTriangle, UserCheck, Loader2
} from 'lucide-react';
import { useNavigate } from 'react-router';
import { getAllUsers, updateUserStatus, changeUserRole } from '../../api/admin';
import { useAuthStore } from '../../store/authStore';
import { getAvatarDataUrl } from '../../lib/avatar';
import toast from 'react-hot-toast';
import { FEATURE_ACCESS_ITEMS, bulkUpdateUserRestrictions } from '../../api/featureAccess';

export const AdminUsersPage: React.FC = () => {
  const navigate = useNavigate();
  const adminProfile = useAuthStore(state => state.profile);
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

  const fetchUsers = async () => {
    setIsLoading(true);
    const { data, count } = await getAllUsers({ searchTerm, role: filterRole }, page);
    if (data) setUsers(data);
    if (count !== null) setTotalCount(count);
    setIsLoading(false);
  };

  const toggleSelectAll = () => {
    if (selectedUsers.length === users.length) setSelectedUsers([]);
    else setSelectedUsers(users.map(u => u.id));
  };

  const toggleSelectUser = (id: string) => {
    if (selectedUsers.includes(id)) setSelectedUsers(selectedUsers.filter(userId => userId !== id));
    else setSelectedUsers([...selectedUsers, id]);
  };

  const handleUpdateStatus = async (userId: string, status: string, name: string) => {
    if (!adminProfile) return;
    const loadingToast = toast.loading(`Updating status for ${name}...`);
    const { error } = await updateUserStatus(adminProfile.id, userId, status, `Admin action: ${status}`);
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

  const handleBulkRestrict = async () => {
    if (!adminProfile?.id || !selectedUsers.length) return;
    const confirmed = window.confirm(`${bulkMode === 'disable' ? 'Disable' : 'Enable'} ${bulkFeature} for ${selectedUsers.length} selected user(s)?`);
    if (!confirmed) return;

    const loadingToast = toast.loading('Applying restrictions...');
    const { error } = await bulkUpdateUserRestrictions(adminProfile.id, selectedUsers, {
      restrictedFeatures: [bulkFeature],
      reason: bulkReason,
      mode: bulkMode,
    });

    if (error) {
      toast.error(error.message || 'Failed to apply restrictions', { id: loadingToast });
      return;
    }

    toast.success(`Successfully ${bulkMode === 'disable' ? 'disabled' : 'enabled'} feature for selected users.`, { id: loadingToast });
    setSelectedUsers([]);
    setBulkReason('');
  };

  const RoleBadge = ({ role }: { role: string }) => {
    const roles: Record<string, { color: string, label: string, icon: any }> = {
      student: { color: 'bg-[#F0F9FF] text-[#0057FF]', label: 'Student', icon: UserCheck },
      canteen_owner: { color: 'bg-[#0057FF]/20 text-[#0057FF] border-[#0057FF]/30', label: 'Canteen', icon: StoreIcon },
      print_shop: { color: 'bg-[#FEF9C3] text-[#CA8A04] border-[#FFD600]/30', label: 'Print Shop', icon: PrinterIcon },
      admin: { color: 'bg-[#FFD600] text-[#0D0D0D] border-transparent font-black', label: 'Admin', icon: Shield },
    };
    const r = roles[role] || roles.student;
    const Icon = r.icon;
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold border ${r.color}`}>
        <Icon className="w-3 h-3" />
        {r.label}
      </span>
    );
  };

  const StatusBadge = ({ status }: { status: string }) => {
    const statuses: Record<string, { color: string, label: string }> = {
      active: { color: 'bg-[#DCFCE7] text-[#16A34A]', label: 'Active' },
      restricted: { color: 'bg-[#FEF9C3] text-[#CA8A04]', label: 'Restricted' },
      banned: { color: 'bg-[#FEE2E2] text-[#DC2626]', label: 'Banned' },
    };
    const s = statuses[status] || statuses.active;
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider ${s.color}`}>
         {status === 'active' && <span className="w-1.5 h-1.5 rounded-md bg-[#16A34A] mr-1" />}
         {status === 'banned' && <span className="w-1.5 h-1.5 rounded-md bg-[#DC2626] mr-1" />}
        {s.label}
      </span>
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      {/* Top Bar */}
      <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-4 bg-white p-4 rounded-lg border border-black/[0.08]">
        
        {/* Search */}
        <div className="relative w-full lg:w-96 group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B6B6B] group-focus-within:text-[#FFD600] transition-colors" />
          <input 
            type="text" 
            placeholder="Search name, email, college..." 
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
            className="w-full bg-[#F7F5F0] border border-black/10 rounded-lg py-2 pl-9 pr-4 text-sm text-[#0D0D0D] placeholder-[#6B6B6B] focus:outline-none focus:border-[#FFD600]/50 focus:bg-[#F7F5F0] transition-colors"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {['all', 'student', 'canteen_owner', 'print_shop', 'admin'].map(pill => (
            <button 
              key={pill} 
              onClick={() => { setFilterRole(pill); setPage(1); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold font-sans transition-colors capitalize ${filterRole === pill ? 'bg-[#FFD600] text-[#0D0D0D]' : 'bg-[#F7F5F0] text-[#6B6B6B] hover:text-[#0D0D0D] border border-black/[0.08] hover:border-black/10'}`}
            >
              {pill.replace('_', ' ')}
            </button>
          ))}
          <div className="h-6 w-px bg-[#F7F5F0] mx-2 hidden lg:block" />
          <button className="flex items-center gap-2 px-4 py-2 bg-[#F7F5F0] hover:bg-[#F7F5F0] text-[#0D0D0D] border border-black/10 rounded-lg text-sm font-sans font-bold transition-colors">
            <Download className="w-4 h-4" /> Export CSV
          </button>
        </div>
      </div>

      {/* Bulk Actions Bar */}
      {selectedUsers.length > 0 && (
        <div className="bg-[#FFD600]/10 border border-[#FFD600]/20 rounded-lg p-3 flex items-center justify-between animate-in slide-in-from-top-4">
          <div className="flex items-center gap-3">
            <span className="text-[#7C5C00] font-sans font-bold text-sm">
              {selectedUsers.length} user{selectedUsers.length > 1 ? 's' : ''} selected
            </span>
            <select value={bulkFeature} onChange={(event) => setBulkFeature(event.target.value)} className="rounded-md border border-black/10 bg-white px-3 py-1.5 text-xs font-semibold text-[#0D0D0D]">
              {FEATURE_ACCESS_ITEMS.map((item) => (
                <option key={item.key} value={item.key}>{item.label}</option>
              ))}
            </select>
            <select value={bulkMode} onChange={(event) => setBulkMode(event.target.value as 'disable' | 'enable')} className="rounded-md border border-black/10 bg-white px-3 py-1.5 text-xs font-semibold text-[#0D0D0D]">
              <option value="disable">Disable</option>
              <option value="enable">Enable</option>
            </select>
            <input value={bulkReason} onChange={(event) => setBulkReason(event.target.value)} placeholder="Reason (optional)" className="w-56 rounded-md border border-black/10 bg-white px-3 py-1.5 text-xs text-[#0D0D0D]" />
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleBulkRestrict} className="px-3 py-1.5 bg-[#FFF8D4] text-[#7C5C00] hover:bg-[#FFE993] rounded text-xs font-bold font-sans transition-colors flex items-center gap-1.5 border border-[#FFD600]/30">
              <ShieldAlert className="w-3.5 h-3.5" /> {bulkMode === 'disable' ? 'Disable Selected' : 'Enable Selected'}
            </button>
            <button className="px-3 py-1.5 bg-[#FEE2E2] text-[#DC2626] hover:bg-[#DC2626]/30 rounded text-xs font-bold font-sans transition-colors flex items-center gap-1.5">
              <Ban className="w-3.5 h-3.5" /> Ban Selected
            </button>
          </div>
        </div>
      )}

      {/* Table Area */}
      <div className="bg-white border border-black/[0.08] rounded-lg overflow-x-auto min-h-[400px]">
        {isLoading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-[#FFD600]" />
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead className="bg-[#F5F4F0] h-[40px] border-b border-[#E8E8E8]">
              <tr className="border-b border-black/[0.08] bg-[#F7F5F0] hover:bg-[#FAFAF8] transition-colors duration-150">
                <th className="p-4 w-12 text-center px-4 text-left font-sans font-semibold text-[12px] text-[#9B9B9B] uppercase tracking-[0.6px]">
                  <input 
                    type="checkbox" 
                    checked={selectedUsers.length === users.length && users.length > 0}
                    onChange={toggleSelectAll}
                    className="rounded bg-[#FAFAF8] border-black/10 text-[#FFD600] focus:ring-[#FFD600]/50" 
                  />
                </th>
                <th className="p-4 text-xs font-bold text-[#6B6B6B] uppercase tracking-wider font-sans px-4 text-left font-sans font-semibold text-[12px] text-[#9B9B9B] uppercase tracking-[0.6px]">User</th>
                <th className="p-4 text-xs font-bold text-[#6B6B6B] uppercase tracking-wider font-sans px-4 text-left font-sans font-semibold text-[12px] text-[#9B9B9B] uppercase tracking-[0.6px]">Contact & College</th>
                <th className="p-4 text-xs font-bold text-[#6B6B6B] uppercase tracking-wider font-sans px-4 text-left font-sans font-semibold text-[12px] text-[#9B9B9B] uppercase tracking-[0.6px]">Role</th>
                <th className="p-4 text-xs font-bold text-[#6B6B6B] uppercase tracking-wider font-sans px-4 text-left font-sans font-semibold text-[12px] text-[#9B9B9B] uppercase tracking-[0.6px]">Reputation ⭐</th>
                <th className="p-4 text-xs font-bold text-[#6B6B6B] uppercase tracking-wider font-sans px-4 text-left font-sans font-semibold text-[12px] text-[#9B9B9B] uppercase tracking-[0.6px]">Status</th>
                <th className="p-4 w-16 text-center text-xs font-bold text-[#6B6B6B] uppercase tracking-wider font-sans px-4 text-left font-sans font-semibold text-[12px] text-[#9B9B9B] uppercase tracking-[0.6px]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/[0.06] relative">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-black/[0.03] transition-colors group">
                  <td className="p-4 text-center">
                    <input 
                      type="checkbox" 
                      checked={selectedUsers.includes(user.id)}
                      onChange={() => toggleSelectUser(user.id)}
                      className="rounded bg-[#FAFAF8] border-black/10 text-[#FFD600] focus:ring-[#FFD600]/50" 
                    />
                  </td>
                  <td className="p-4 min-w-[200px]">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#222222] flex items-center justify-center font-syne font-bold text-[#0D0D0D] shrink-0 overflow-hidden">
                        <img
                          src={user.avatar_url || getAvatarDataUrl({ name: user.name, email: user.email, seed: user.id || user.username })}
                          alt={user.name || 'User'}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div>
                        <div className="font-sans font-bold text-sm text-[#0D0D0D]">{user.name || 'Unnamed'}</div>
                        <div className="font-sans text-xs text-[#6B6B6B]">Joined {new Date(user.created_at).toLocaleDateString()}</div>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                     <div className="font-sans text-sm text-[#0D0D0D] mb-0.5">{user.email}</div>
                     <div className="font-sans text-xs text-[#6B6B6B]">{user.college || 'No college specified'}</div>
                  </td>
                  <td className="p-4">
                    <RoleBadge role={user.role || 'student'} />
                  </td>
                  <td className="p-4">
                      <div className="font-syne font-bold text-sm text-[#CA8A04] flex items-center gap-1">
                        ⭐ {(user.campus_credits || 0).toLocaleString()} Reputation
                    </div>
                  </td>
                  <td className="p-4">
                    <StatusBadge status={user.status || 'active'} />
                  </td>
                  <td className="p-4 text-center relative">
                    <button 
                      onClick={() => setActiveDropdown(activeDropdown === user.id ? null : user.id)}
                      className="p-1.5 rounded-lg text-[#6B6B6B] hover:text-[#0D0D0D] hover:bg-[#F7F5F0] transition-colors"
                    >
                      <MoreVertical className="w-5 h-5" />
                    </button>

                    {/* Actions Dropdown */}
                    {activeDropdown === user.id && (
                      <div className="absolute right-[50px] top-4 w-48 bg-[#F7F5F0] border border-black/10 rounded-lg shadow-md z-20 py-1 font-sans text-sm overflow-hidden animate-in zoom-in-95 duration-100">
                        <div className="px-3 py-2 border-b border-black/[0.08]">
                          <span className="text-xs font-bold text-[#6B6B6B] uppercase tracking-wider">User</span>
                        </div>
                        <button onClick={() => navigate(`/admin/users/${user.id}`)} className="w-full text-left px-4 py-2 text-[#0D0D0D] hover:bg-black/[0.03] flex items-center gap-2">
                          <Edit3 className="w-4 h-4 text-[#CA8A04]" /> Open details
                        </button>

                        <div className="h-px bg-[#F7F5F0] my-1" />
                        <div className="px-3 py-2 border-b border-black/[0.08]">
                          <span className="text-xs font-bold text-[#6B6B6B] uppercase tracking-wider">Manage Roles</span>
                        </div>
                        {['student', 'canteen_owner', 'print_shop', 'admin'].map(r => (
                          user.role !== r && (
                            <button key={r} onClick={() => handleChangeRole(user.id, r, user.name)} className="w-full text-left px-4 py-2 text-[#0D0D0D] hover:bg-black/[0.03] flex items-center gap-2 capitalize">
                              <ShieldAlert className="w-4 h-4 text-[#FFD600]" /> Make {r.replace('_', ' ')}
                            </button>
                          )
                        ))}
                        
                        <div className="h-px bg-[#F7F5F0] my-1" />
                        <div className="px-3 py-2 border-b border-black/[0.08]">
                          <span className="text-xs font-bold text-[#6B6B6B] uppercase tracking-wider">Manage Access</span>
                        </div>
                        
                        {user.status !== 'active' && (
                          <button onClick={() => handleUpdateStatus(user.id, 'active', user.name)} className="w-full text-left px-4 py-2 text-[#16A34A] hover:bg-[#16A34A]/10 flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4" /> Unban / Activate
                          </button>
                        )}
                        {user.status !== 'restricted' && (
                          <button onClick={() => handleUpdateStatus(user.id, 'restricted', user.name)} className="w-full text-left px-4 py-2 text-[#FFD600] hover:bg-[#FFD600]/10 flex items-center gap-2">
                            <Ban className="w-4 h-4" /> Restrict Account
                          </button>
                        )}
                        {user.status !== 'banned' && (
                          <button onClick={() => handleUpdateStatus(user.id, 'banned', user.name)} className="w-full text-left px-4 py-2 text-[#DC2626] hover:bg-[#DC2626]/10 flex items-center gap-2 font-bold">
                            <UserX className="w-4 h-4" /> Ban Account
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-[#6B6B6B] font-sans">
                    No users found matching your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
        
        {/* Pagination mock */}
        <div className="p-4 border-t border-black/[0.08] flex items-center justify-between text-sm font-sans text-[#6B6B6B]">
          <span>Showing {users.length > 0 ? (page - 1) * 20 + 1 : 0}-{Math.min(page * 20, totalCount)} of {totalCount} users</span>
          <div className="flex items-center gap-2">
             <button disabled={page === 1} onClick={() => setPage(page-1)} className="px-3 py-1 rounded bg-[#F7F5F0] hover:bg-[#F7F5F0] transition-colors disabled:opacity-50 disabled:cursor-not-allowed">Prev</button>
             <button disabled={page * 20 >= totalCount} onClick={() => setPage(page+1)} className="px-3 py-1 rounded bg-[#F7F5F0] hover:bg-[#F7F5F0] text-[#0D0D0D] transition-colors disabled:opacity-50 disabled:cursor-not-allowed">Next</button>
          </div>
        </div>
      </div>

    </div>
  );
};

// SVG Mocks for roles lacking direct lucide matches without bleeding scope
function StoreIcon(props: any) { return <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7"/><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4"/><path d="M2 7h20"/><path d="M22 7v3a2 2 0 0 1-2 2v0a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 16 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 12 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 8 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 4 12v0a2 2 0 0 1-2-2V7"/></svg> }
function PrinterIcon(props: any) { return <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect width="12" height="8" x="6" y="14"/></svg> }
