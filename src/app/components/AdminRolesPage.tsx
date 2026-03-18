import React, { useEffect, useState } from 'react';
import { Coffee, Loader2, Printer, Search, Shield } from 'lucide-react';
import toast from 'react-hot-toast';
import { changeUserRole, getAllUsers, getAuditLogs } from '../../api/admin';
import { useAuthStore } from '../../store/authStore';

const roleOptions = ['student', 'teacher', 'canteen_owner', 'print_shop', 'admin'];

const roleDescriptions: Record<string, string> = {
  student: 'Default role — access to all student features',
  teacher: 'Faculty/staff member account',
  canteen_owner: 'Grants access to the Canteen Dashboard',
  print_shop: 'Grants access to the Print Dashboard',
  admin: 'Full admin access to all pages and settings',
};

export const AdminRolesPage: React.FC = () => {
  const profile = useAuthStore((state) => state.profile);
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [selectedRole, setSelectedRole] = useState('student');
  const [auditLog, setAuditLog] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [confirmText, setConfirmText] = useState('');

  const loadAuditLog = async () => {
    const { data } = await getAuditLogs();
    setAuditLog((data || []).filter((entry) => String(entry.action || '').includes('ROLE')).slice(0, 8));
  };

  useEffect(() => {
    loadAuditLog();
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(async () => {
      if (searchTerm.trim().length < 2) {
        setResults([]);
        return;
      }

      setIsLoading(true);
      const { data } = await getAllUsers({ searchTerm }, 1);
      setResults(data || []);
      setIsLoading(false);
    }, 200);

    return () => window.clearTimeout(timer);
  }, [searchTerm]);

  const handleApplyRole = async () => {
    if (!profile?.id || !selectedUser?.id) return;
    if (selectedRole === 'admin' && confirmText !== 'CONFIRM ADMIN ACCESS') {
      toast.error('Type the confirmation phrase first.');
      return;
    }

    const { error } = await changeUserRole(profile.id, selectedUser.id, selectedRole);
    if (error) {
      toast.error('Failed to update role.');
      return;
    }

    toast.success('Role updated.');
    setSelectedUser({ ...selectedUser, role: selectedRole });
    setConfirmText('');
    loadAuditLog();
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Dashboard Access Info Banner */}
      <div className="rounded-lg border border-[#FFD600]/40 bg-[#FFF8D4] p-5">
        <h3 className="font-syne font-bold text-[#0D0D0D] text-[16px] mb-3">Dashboard Access Control</h3>
        <p className="text-sm text-[#6B6B6B] mb-4">Assign the role below to grant a user access to the corresponding restricted dashboard. Users without the correct role will see an access-denied page.</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="flex items-start gap-3 rounded-lg border border-black/[0.08] bg-white p-4">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-[#FFF8D4]">
              <Coffee className="h-4 w-4 text-[#CA8A04]" />
            </div>
            <div>
              <p className="font-bold text-[14px] text-[#0D0D0D]">Canteen Dashboard</p>
              <p className="text-[12px] text-[#6B6B6B] mt-0.5">Route: /canteen-dashboard</p>
              <p className="text-[12px] text-[#6B6B6B]">Required role: <span className="font-bold text-[#0D0D0D]">canteen_owner</span></p>
            </div>
          </div>
          <div className="flex items-start gap-3 rounded-lg border border-black/[0.08] bg-white p-4">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-[#FFF8D4]">
              <Printer className="h-4 w-4 text-[#CA8A04]" />
            </div>
            <div>
              <p className="font-bold text-[14px] text-[#0D0D0D]">Print Dashboard</p>
              <p className="text-[12px] text-[#6B6B6B] mt-0.5">Route: /print-dashboard</p>
              <p className="text-[12px] text-[#6B6B6B]">Required role: <span className="font-bold text-[#0D0D0D]">print_shop</span></p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        <div className="rounded-lg border border-black/[0.08] bg-white p-6 lg:col-span-8">
          <h2 className="mb-6 font-syne text-xl font-bold text-[#0D0D0D]">Assign System Role</h2>
          <div className="relative mb-6"><Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#6B6B6B]" /><input value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Search user by name or email..." className="w-full rounded-lg border border-black/10 bg-[#F7F5F0] py-4 pl-12 pr-4 text-base text-[#0D0D0D] outline-none focus:border-[#FFD600]" /></div>

          {isLoading ? <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-[#FFD600]" /></div> : results.length > 0 ? (
            <div className="space-y-3">
              {results.slice(0, 6).map((user) => (
                <button key={user.id} onClick={() => { setSelectedUser(user); setSelectedRole(user.role || 'student'); }} className={`flex w-full items-center justify-between rounded-lg border px-4 py-4 text-left transition-colors ${selectedUser?.id === user.id ? 'border-[#FFD600] bg-[#F7F5F0]' : 'border-black/[0.08] bg-[#FAFAF8] hover:border-black/10'}`}>
                  <div><div className="font-bold text-[#0D0D0D]">{user.name || 'Unnamed user'}</div><div className="text-xs text-[#6B6B6B]">{user.email}</div></div>
                  <span className="rounded-md bg-[#F7F5F0] px-3 py-1 text-xs font-bold uppercase tracking-wider text-[#0D0D0D]">{user.role || 'student'}</span>
                </button>
              ))}
            </div>
          ) : <div className="rounded-lg border border-dashed border-black/10 bg-[#FAFAF8] p-8 text-center text-sm text-[#6B6B6B]">Search for a user to begin changing roles.</div>}

          {selectedUser && (
            <div className="mt-6 space-y-4 rounded-lg border border-black/[0.08] bg-[#F7F5F0] p-5">
              <div><div className="font-bold text-[#0D0D0D]">{selectedUser.name}</div><div className="text-sm text-[#6B6B6B]">Current role: {selectedUser.role || 'student'}</div></div>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {roleOptions.map((role) => (
                <button key={role} onClick={() => setSelectedRole(role)} className={`rounded-lg border px-4 py-3 text-left transition-colors ${selectedRole === role ? 'border-[#FFD600] bg-[#FFD600]/10' : 'border-black/[0.08] bg-[#FAFAF8] hover:border-black/20'}`}>
                  <div className={`text-sm font-bold uppercase tracking-wider ${selectedRole === role ? 'text-[#CA8A04]' : 'text-[#0D0D0D]'}`}>{role}</div>
                  {roleDescriptions[role] && <div className="mt-0.5 text-[11px] font-medium normal-case tracking-normal text-[#6B6B6B]">{roleDescriptions[role]}</div>}
                </button>
              ))}
              </div>
              {selectedRole === 'admin' && <div className="rounded-lg border border-[#FF3D57]/30 bg-[#DC2626]/10 p-4"><p className="mb-3 text-sm font-bold text-[#DC2626]">Admin access warning</p><input value={confirmText} onChange={(event) => setConfirmText(event.target.value)} placeholder="Type CONFIRM ADMIN ACCESS" className="w-full rounded-lg border border-[#FF3D57]/40 bg-[#FAFAF8] px-4 py-3 text-sm text-[#0D0D0D] outline-none" /></div>}
              <button onClick={handleApplyRole} className="inline-flex items-center gap-2 rounded-lg bg-[#FFD600] px-5 py-3 text-sm font-bold text-[#0D0D0D]"><Shield className="h-4 w-4" /> Apply role</button>
            </div>
          )}
        </div>

        <div className="rounded-lg border border-black/[0.08] bg-white p-6 lg:col-span-4">
          <h2 className="mb-6 font-syne text-lg font-bold text-[#0D0D0D]">Recent Role Changes</h2>
          <div className="space-y-3">
            {auditLog.length > 0 ? auditLog.map((entry) => (
              <div key={entry.id} className="rounded-lg border border-black/[0.08] bg-[#F7F5F0] p-3">
                <div className="text-sm font-bold text-[#0D0D0D]">{entry.target_name || 'Unknown target'}</div>
                <div className="mt-1 text-xs text-[#6B6B6B]">{entry.action}</div>
                <div className="mt-2 text-[10px] uppercase tracking-wider text-[#AAAAAA]">{new Date(entry.created_at).toLocaleString()}</div>
              </div>
            )) : <div className="text-sm text-[#6B6B6B]">No role changes recorded yet.</div>}
          </div>
        </div>
      </div>
    </div>
  );
};
