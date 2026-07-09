import React, { useEffect, useState } from 'react';
import { Coffee, Loader2, Printer, Search, Shield } from 'lucide-react';
import toast from 'react-hot-toast';
import { changeUserRole, getAllUsers, getAuditLogs, getPendingTeacherRequests, resolveTeacherRequest } from '../../api/admin';
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
  const [pendingTeacherRequests, setPendingTeacherRequests] = useState<any[]>([]);
  const [loadingTeacherRequests, setLoadingTeacherRequests] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [confirmText, setConfirmText] = useState('');

  const loadAuditLog = async () => {
    const { data } = await getAuditLogs();
    setAuditLog((data || []).filter((entry) => String(entry.action || '').includes('ROLE')).slice(0, 8));
  };

  const loadTeacherRequests = async () => {
    setLoadingTeacherRequests(true);
    const { data, error } = await getPendingTeacherRequests();
    if (error) {
      toast.error('Failed to load professor signup requests.');
      setPendingTeacherRequests([]);
      setLoadingTeacherRequests(false);
      return;
    }

    setPendingTeacherRequests(data || []);
    setLoadingTeacherRequests(false);
  };

  useEffect(() => {
    loadAuditLog();
    loadTeacherRequests();
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

  const handleTeacherRequestDecision = async (userId: string, decision: 'approve' | 'reject') => {
    if (!profile?.id || !userId) return;

    const loadingId = toast.loading(decision === 'approve' ? 'Approving professor request...' : 'Rejecting professor request...');
    const { error } = await resolveTeacherRequest(profile.id, userId, decision);

    if (error) {
      toast.error('Could not update request.', { id: loadingId });
      return;
    }

    toast.success(decision === 'approve' ? 'Professor request approved.' : 'Professor request rejected.', { id: loadingId });
    loadTeacherRequests();
    loadAuditLog();
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Dashboard Access Info Banner */}
      <div className="rounded-lg border border-[var(--yellow)]/40 bg-[var(--yellow-light)] p-5">
        <h3 className="font-syne font-bold text-[var(--text-primary)] text-[16px] mb-3">Dashboard Access Control</h3>
        <p className="text-sm text-[var(--text-secondary)] mb-4">Assign the role below to grant a user access to the corresponding restricted dashboard. Users without the correct role will see an access-denied page.</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="flex items-start gap-3 rounded-lg border border-black/[0.08] bg-[var(--bg)] p-4">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-[var(--yellow-light)]">
              <Coffee className="h-4 w-4 text-[var(--yellow-dark)]" />
            </div>
            <div>
              <p className="font-bold text-[14px] text-[var(--text-primary)]">Canteen Dashboard</p>
              <p className="text-[12px] text-[var(--text-secondary)] mt-0.5">Route: /canteen-dashboard</p>
              <p className="text-[12px] text-[var(--text-secondary)]">Required role: <span className="font-bold text-[var(--text-primary)]">canteen_owner</span></p>
            </div>
          </div>
          <div className="flex items-start gap-3 rounded-lg border border-black/[0.08] bg-[var(--bg)] p-4">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-[var(--yellow-light)]">
              <Printer className="h-4 w-4 text-[var(--yellow-dark)]" />
            </div>
            <div>
              <p className="font-bold text-[14px] text-[var(--text-primary)]">Print Dashboard</p>
              <p className="text-[12px] text-[var(--text-secondary)] mt-0.5">Route: /print-dashboard</p>
              <p className="text-[12px] text-[var(--text-secondary)]">Required role: <span className="font-bold text-[var(--text-primary)]">print_shop</span></p>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-black/[0.08] bg-[var(--bg)] p-6">
        <h2 className="mb-4 font-syne text-xl font-bold text-[var(--text-primary)]">Professor Signup Requests</h2>
        <p className="mb-5 text-sm text-[var(--text-secondary)]">Review pending professor account requests and approve or reject them directly from the admin panel.</p>

        {loadingTeacherRequests ? (
          <div className="flex justify-center py-6"><Loader2 className="h-6 w-6 animate-spin text-[var(--yellow)]" /></div>
        ) : pendingTeacherRequests.length === 0 ? (
          <div className="rounded-lg border border-dashed border-black/10 bg-[var(--bg-primary)] p-6 text-sm text-[var(--text-secondary)]">
            No pending professor signup requests.
          </div>
        ) : (
          <div className="space-y-3">
            {pendingTeacherRequests.map((request) => (
              <div key={request.id} className="rounded-lg border border-black/[0.08] bg-[var(--bg-primary)] p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <div className="font-bold text-[var(--text-primary)]">{request.name || 'Unnamed user'}</div>
                    <div className="text-xs text-[var(--text-secondary)]">{request.email || 'No email'}</div>
                    <div className="mt-1 text-xs text-[var(--text-secondary)]">College: {request.college || 'Not specified'}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleTeacherRequestDecision(request.id, 'reject')}
                      className="rounded-lg border border-black/15 bg-[var(--bg)] px-3 py-2 text-xs font-bold text-[var(--text-primary)] hover:bg-black/[0.03]"
                    >
                      Reject
                    </button>
                    <button
                      onClick={() => handleTeacherRequestDecision(request.id, 'approve')}
                      className="rounded-lg bg-[var(--yellow)] px-3 py-2 text-xs font-bold text-[var(--text-primary)] hover:brightness-95"
                    >
                      Approve
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        <div className="rounded-lg border border-black/[0.08] bg-[var(--bg)] p-6 lg:col-span-8">
          <h2 className="mb-6 font-syne text-xl font-bold text-[var(--text-primary)]">Assign System Role</h2>
          <div className="relative mb-6"><Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--text-secondary)]" /><input value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Search user by name or email..." className="w-full rounded-lg border border-black/10 bg-[var(--bg-tertiary)] py-4 pl-12 pr-4 text-base text-[var(--text-primary)] outline-none focus:border-[var(--yellow)]" /></div>

          {isLoading ? <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-[var(--yellow)]" /></div> : results.length > 0 ? (
            <div className="space-y-3">
              {results.slice(0, 6).map((user) => (
                <button key={user.id} onClick={() => { setSelectedUser(user); setSelectedRole(user.role || 'student'); }} className={`flex w-full items-center justify-between rounded-lg border px-4 py-4 text-left transition-colors ${selectedUser?.id === user.id ? 'border-[var(--yellow)] bg-[var(--bg-tertiary)]' : 'border-black/[0.08] bg-[var(--bg-primary)] hover:border-black/10'}`}>
                  <div><div className="font-bold text-[var(--text-primary)]">{user.name || 'Unnamed user'}</div><div className="text-xs text-[var(--text-secondary)]">{user.email}</div></div>
                  <span className="rounded-md bg-[var(--bg-tertiary)] px-3 py-1 text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">{user.role || 'student'}</span>
                </button>
              ))}
            </div>
          ) : <div className="rounded-lg border border-dashed border-black/10 bg-[var(--bg-primary)] p-8 text-center text-sm text-[var(--text-secondary)]">Search for a user to begin changing roles.</div>}

          {selectedUser && (
            <div className="mt-6 space-y-4 rounded-lg border border-black/[0.08] bg-[var(--bg-tertiary)] p-5">
              <div><div className="font-bold text-[var(--text-primary)]">{selectedUser.name}</div><div className="text-sm text-[var(--text-secondary)]">Current role: {selectedUser.role || 'student'}</div></div>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {roleOptions.map((role) => (
                <button key={role} onClick={() => setSelectedRole(role)} className={`rounded-lg border px-4 py-3 text-left transition-colors ${selectedRole === role ? 'border-[var(--yellow)] bg-[var(--yellow)]/10' : 'border-black/[0.08] bg-[var(--bg-primary)] hover:border-black/20'}`}>
                  <div className={`text-sm font-bold uppercase tracking-wider ${selectedRole === role ? 'text-[var(--yellow-dark)]' : 'text-[var(--text-primary)]'}`}>{role}</div>
                  {roleDescriptions[role] && <div className="mt-0.5 text-[11px] font-medium normal-case tracking-normal text-[var(--text-secondary)]">{roleDescriptions[role]}</div>}
                </button>
              ))}
              </div>
              {selectedRole === 'admin' && <div className="rounded-lg border border-[var(--error)]/30 bg-[#DC2626]/10 p-4"><p className="mb-3 text-sm font-bold text-[#DC2626]">Admin access warning</p><input value={confirmText} onChange={(event) => setConfirmText(event.target.value)} placeholder="Type CONFIRM ADMIN ACCESS" className="w-full rounded-lg border border-[var(--error)]/40 bg-[var(--bg-primary)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none" /></div>}
              <button onClick={handleApplyRole} className="inline-flex items-center gap-2 rounded-lg bg-[var(--yellow)] px-5 py-3 text-sm font-bold text-[var(--text-primary)]"><Shield className="h-4 w-4" /> Apply role</button>
            </div>
          )}
        </div>

        <div className="rounded-lg border border-black/[0.08] bg-[var(--bg)] p-6 lg:col-span-4">
          <h2 className="mb-6 font-syne text-lg font-bold text-[var(--text-primary)]">Recent Role Changes</h2>
          <div className="space-y-3">
            {auditLog.length > 0 ? auditLog.map((entry) => (
              <div key={entry.id} className="rounded-lg border border-black/[0.08] bg-[var(--bg-tertiary)] p-3">
                <div className="text-sm font-bold text-[var(--text-primary)]">{entry.target_name || 'Unknown target'}</div>
                <div className="mt-1 text-xs text-[var(--text-secondary)]">{entry.action}</div>
                <div className="mt-2 text-[10px] uppercase tracking-wider text-[var(--text-muted)]">{new Date(entry.created_at).toLocaleString()}</div>
              </div>
            )) : <div className="text-sm text-[var(--text-secondary)]">No role changes recorded yet.</div>}
          </div>
        </div>
      </div>
    </div>
  );
};
