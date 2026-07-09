import React, { useEffect, useState } from 'react';
import { Loader2, Search, Unlock } from 'lucide-react';
import toast from 'react-hot-toast';
import { getAllUsers, updateUserStatus } from '../../api/admin';
import { useAuthStore } from '../../store/authStore';

export const AdminBannedUsersPage: React.FC = () => {
  const profile = useAuthStore((state) => state.profile);
  const [users, setUsers] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const loadUsers = async () => {
    setIsLoading(true);
    const { data } = await getAllUsers({ status: 'banned', searchTerm }, 1);
    setUsers(data || []);
    setIsLoading(false);
  };

  useEffect(() => {
    const timer = window.setTimeout(loadUsers, 200);
    return () => window.clearTimeout(timer);
  }, [searchTerm]);

  const handleUnban = async (userId: string) => {
    if (!profile?.id) return;
    const { error } = await updateUserStatus(profile.id, userId, 'active');
    if (error) {
      toast.error('Failed to unban user.');
      return;
    }
    toast.success('User restored.');
    loadUsers();
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="rounded-lg border border-black/[0.08] bg-[var(--bg)] p-4">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-secondary)]" />
          <input value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Search banned users..." className="w-full rounded-lg border border-black/10 bg-[var(--bg-tertiary)] py-2 pl-9 pr-4 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--yellow)]" />
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-7 w-7 animate-spin text-[var(--yellow)]" /></div>
      ) : users.length > 0 ? (
        <div className="overflow-x-auto rounded-lg border border-black/[0.08] bg-[var(--bg)]">
          <table className="w-full border-collapse text-left">
            <thead className="bg-[var(--bg-secondary)] h-[40px] border-b border-[var(--border)]">
              <tr className="border-b border-black/[0.08] bg-[var(--bg-tertiary)] hover:bg-[var(--bg-primary)] transition-colors duration-150">
                <th className="p-4 text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] px-4 text-left font-sans font-semibold text-[12px] text-[var(--text-muted)] uppercase tracking-[0.6px]">User</th>
                <th className="p-4 text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] px-4 text-left font-sans font-semibold text-[12px] text-[var(--text-muted)] uppercase tracking-[0.6px]">Reason</th>
                <th className="p-4 text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] px-4 text-left font-sans font-semibold text-[12px] text-[var(--text-muted)] uppercase tracking-[0.6px]">Banned At</th>
                <th className="p-4 text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] px-4 text-left font-sans font-semibold text-[12px] text-[var(--text-muted)] uppercase tracking-[0.6px]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/[0.06]">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-black/[0.03]">
                  <td className="p-4 text-sm text-[var(--text-primary)]"><div className="font-bold">{user.name || 'Unnamed user'}</div><div className="text-xs text-[var(--text-secondary)]">{user.email}</div></td>
                  <td className="p-4 text-sm text-[var(--text-primary)]">{user.ban_reason || 'No reason recorded'}</td>
                  <td className="p-4 text-xs text-[var(--text-secondary)]">{user.banned_at ? new Date(user.banned_at).toLocaleString() : 'Unknown'}</td>
                  <td className="p-4"><button onClick={() => handleUnban(user.id)} className="inline-flex items-center gap-2 rounded-lg bg-[#16A34A]/10 px-3 py-2 text-sm font-bold text-accent-green transition-colors hover:bg-[#16A34A]/20"><Unlock className="h-4 w-4" /> Unban</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-black/10 bg-[var(--bg)] p-10 text-center text-sm text-[var(--text-secondary)]">No banned users found.</div>
      )}
    </div>
  );
};
