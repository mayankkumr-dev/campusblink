import React, { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Download, RefreshCw, Search } from 'lucide-react';
import { useNavigate } from 'react-router';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import {
  adminGenerateBulkInvites,
  adminGenerateInvitesForUser,
  getAdminInviteCodes,
  getAdminInviteStats,
  revokeInviteCode,
} from '../../api/invites';

const EXPIRY_OPTIONS = [
  { value: 'none', label: 'No expiry' },
  { value: '24h', label: '24 hours' },
  { value: '7d', label: '7 days' },
  { value: '30d', label: '30 days' },
];

function toCsv(rows: any[]) {
  const headers = ['Code', 'Created By', 'Used By', 'Status', 'Created', 'Expires'];
  const lines = rows.map((row) => {
    const status = row.is_used ? 'Used' : row.isExpired ? 'Expired' : 'Available';
    return [
      row.code,
      row.createdByUser?.email || '',
      row.usedByUser?.email || '',
      status,
      row.created_at || '',
      row.expires_at || '',
    ]
      .map((item) => `"${String(item || '').replace(/"/g, '""')}"`)
      .join(',');
  });

  return [headers.join(','), ...lines].join('\n');
}

export const AdminInvitesPage: React.FC = () => {
  const navigate = useNavigate();
  const profile = useAuthStore((state) => state.profile);

  const [stats, setStats] = useState({ totalCodes: 0, usedCodes: 0, pendingCodes: 0, invitedUsers: 0 });
  const [codes, setCodes] = useState<any[]>([]);
  const [filter, setFilter] = useState<'all' | 'used' | 'available' | 'expired'>('all');
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [generatedCodes, setGeneratedCodes] = useState<string[]>([]);

  const [targetUserTerm, setTargetUserTerm] = useState('');
  const [targetUsers, setTargetUsers] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [userCodeCount, setUserCodeCount] = useState(2);
  const [userExpiry, setUserExpiry] = useState('none');

  const [bulkCount, setBulkCount] = useState(20);
  const [bulkExpiry, setBulkExpiry] = useState('7d');
  const [bulkNote, setBulkNote] = useState('');

  const conversionRate = useMemo(() => {
    if (!stats.totalCodes) return 0;
    return Math.round((stats.usedCodes / stats.totalCodes) * 100);
  }, [stats.totalCodes, stats.usedCodes]);

  const invitesPerDay = useMemo(() => {
    const map = new Map<string, number>();
    for (const row of codes) {
      const day = new Date(row.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' });
      map.set(day, (map.get(day) || 0) + 1);
    }

    return Array.from(map.entries())
      .map(([day, count]) => ({ day, count }))
      .slice(-10);
  }, [codes]);

  const topInviters = useMemo(() => {
    const map = new Map<string, { id: string; name: string; email: string; count: number }>();
    for (const row of codes) {
      if (!row.createdByUser?.id) continue;
      const current = map.get(row.createdByUser.id) || {
        id: row.createdByUser.id,
        name: row.createdByUser.name || 'User',
        email: row.createdByUser.email || '',
        count: 0,
      };
      if (row.is_used) current.count += 1;
      map.set(row.createdByUser.id, current);
    }

    return Array.from(map.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
  }, [codes]);

  const loadData = async () => {
    if (!profile) return;
    setIsLoading(true);

    const [{ data: statsData, error: statsError }, { data: codeData, error: codeError }] = await Promise.all([
      getAdminInviteStats(profile),
      getAdminInviteCodes(profile, { filter, search }),
    ]);

    if (statsError) toast.error(String(statsError));
    if (codeError) toast.error(String(codeError));

    if (statsData) setStats(statsData);
    if (codeData) setCodes(codeData);

    setIsLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [filter, search, profile?.id]);

  useEffect(() => {
    if (!targetUserTerm.trim() || !profile) {
      setTargetUsers([]);
      return;
    }

    let isMounted = true;
    const timer = window.setTimeout(async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id, name, email, username')
        .or(`username.ilike.%${targetUserTerm}%,email.ilike.%${targetUserTerm}%,name.ilike.%${targetUserTerm}%`)
        .order('created_at', { ascending: false })
        .limit(8);

      if (isMounted) {
        const qLower = targetUserTerm.trim().toLowerCase();
        const sorted = (data || []).sort((a, b) => {
          const aUser = String(a.username || '').toLowerCase();
          const bUser = String(b.username || '').toLowerCase();
          const aEmail = String(a.email || '').toLowerCase();
          const bEmail = String(b.email || '').toLowerCase();
          const aPrio = aUser.startsWith(qLower) || aEmail.startsWith(qLower) ? 0 : aUser.includes(qLower) || aEmail.includes(qLower) ? 1 : 2;
          const bPrio = bUser.startsWith(qLower) || bEmail.startsWith(qLower) ? 0 : bUser.includes(qLower) || bEmail.includes(qLower) ? 1 : 2;
          return aPrio - bPrio;
        });
        setTargetUsers(sorted);
      }
    }, 250);

    return () => {
      isMounted = false;
      window.clearTimeout(timer);
    };
  }, [targetUserTerm, profile?.id]);

  const handleGenerateForUser = async () => {
    if (!profile || !selectedUser?.id) {
      toast.error('Select a user first.');
      return;
    }

    const { data, error } = await adminGenerateInvitesForUser(profile, {
      targetUserId: selectedUser.id,
      count: userCodeCount,
      expiry: userExpiry,
    });

    if (error) {
      toast.error(String(error));
      return;
    }

    setGeneratedCodes((data || []).map((item: any) => item.code));
    toast.success(`Generated ${(data || []).length} codes for ${selectedUser.name}.`);
    await loadData();
  };

  const handleGenerateBulk = async () => {
    if (!profile) return;

    const { data, error } = await adminGenerateBulkInvites(profile, {
      count: bulkCount,
      expiry: bulkExpiry,
      note: bulkNote,
    });

    if (error) {
      toast.error(String(error));
      return;
    }

    const nextCodes = (data || []).map((item: any) => item.code);
    setGeneratedCodes(nextCodes);
    toast.success(`Generated ${nextCodes.length} bulk invite codes.`);
    await loadData();
  };

  const copyAllGenerated = async () => {
    if (!generatedCodes.length) return;
    try {
      await navigator.clipboard.writeText(generatedCodes.join('\n'));
      toast.success('All generated codes copied.');
    } catch {
      toast.error('Could not copy generated codes.');
    }
  };

  const exportCsv = () => {
    const csv = toCsv(codes);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `campus-blink-invite-codes-${Date.now()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleRevoke = async (inviteId: string) => {
    if (!profile) return;
    const { error } = await revokeInviteCode(profile, inviteId);
    if (error) {
      toast.error(String(error));
      return;
    }
    toast.success('Invite code revoked.');
    await loadData();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="font-syne text-3xl font-extrabold text-slate-900">Invite Codes</h1>
          <p className="font-sans text-sm text-slate-500">Manage invite access and monitor conversion.</p>
        </div>
        <button
          onClick={() => navigate('/admin/invites/waitlist')}
          className="rounded-md border border-black/10 bg-white px-4 py-2 text-sm font-bold text-slate-900 hover:bg-slate-50"
        >
          View Waitlist
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Total codes generated', value: stats.totalCodes },
          { label: 'Total codes used', value: stats.usedCodes },
          { label: 'Total codes pending', value: stats.pendingCodes },
          { label: 'Total users via invite', value: stats.invitedUsers },
        ].map((item) => (
          <div key={item.label} className="rounded-lg border border-black/10 bg-white p-5 shadow-sm">
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">{item.label}</p>
            <p className="mt-3 font-syne text-4xl font-extrabold text-slate-900">{item.value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg border border-black/10 bg-white p-5 space-y-4 shadow-sm">
          <h2 className="font-syne text-xl font-extrabold text-slate-900">Generate Codes For User</h2>
          <div className="space-y-3">
            <label className="block">
              <span className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Search user</span>
              <input
                value={targetUserTerm}
                onChange={(event) => setTargetUserTerm(event.target.value)}
                placeholder="Search by name or email"
                className="mt-1 w-full rounded-lg border border-black/10 px-3 py-2 text-sm outline-none focus:border-amber-400"
              />
            </label>

            {targetUsers.length > 0 ? (
              <div className="max-h-44 overflow-auto rounded-lg border border-black/10 bg-slate-50 p-2 space-y-1">
                {targetUsers.map((user) => (
                  <button
                    key={user.id}
                    onClick={() => {
                      setSelectedUser(user);
                      setTargetUserTerm(user.email || user.name || '');
                      setTargetUsers([]);
                    }}
                    className="w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-white"
                  >
                    <p className="font-bold text-slate-900">{user.name || 'Unnamed user'}</p>
                    <p className="text-xs text-slate-500">{user.email}</p>
                  </button>
                ))}
              </div>
            ) : null}

            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Number of codes</span>
                <input
                  value={userCodeCount}
                  onChange={(event) => setUserCodeCount(Math.max(1, Math.min(100, Number(event.target.value || 1))))}
                  type="number"
                  min={1}
                  max={100}
                  className="mt-1 w-full rounded-lg border border-black/10 px-3 py-2 text-sm outline-none focus:border-amber-400"
                />
              </label>
              <label className="block">
                <span className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Expiry</span>
                <select
                  value={userExpiry}
                  onChange={(event) => setUserExpiry(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-black/10 px-3 py-2 text-sm outline-none focus:border-amber-400"
                >
                  {EXPIRY_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </label>
            </div>

            <button
              onClick={handleGenerateForUser}
              className="w-full rounded-md bg-slate-900 px-4 py-2.5 text-sm font-bold text-white hover:bg-amber-500 hover:text-slate-900"
            >
              Generate Codes For User
            </button>
          </div>
        </div>

        <div className="rounded-lg border border-black/10 bg-white p-5 space-y-4 shadow-sm">
          <h2 className="font-syne text-xl font-extrabold text-slate-900">Bulk Generate Codes</h2>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Number of codes</span>
              <input
                value={bulkCount}
                onChange={(event) => setBulkCount(Math.max(1, Number(event.target.value || 1)))}
                type="number"
                min={1}
                className="mt-1 w-full rounded-lg border border-black/10 px-3 py-2 text-sm outline-none focus:border-amber-400"
              />
            </label>
            <label className="block">
              <span className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Expiry</span>
              <select
                value={bulkExpiry}
                onChange={(event) => setBulkExpiry(event.target.value)}
                className="mt-1 w-full rounded-lg border border-black/10 px-3 py-2 text-sm outline-none focus:border-amber-400"
              >
                {EXPIRY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>
          </div>

          <label className="block">
            <span className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Purpose / Note</span>
            <input
              value={bulkNote}
              onChange={(event) => setBulkNote(event.target.value)}
              placeholder="MAIT orientation day"
              className="mt-1 w-full rounded-lg border border-black/10 px-3 py-2 text-sm outline-none focus:border-amber-400"
            />
          </label>

          <button
            onClick={handleGenerateBulk}
            className="w-full rounded-md bg-amber-500 px-4 py-2.5 text-sm font-bold text-slate-900 hover:bg-slate-900 hover:text-amber-500"
          >
            Generate Bulk Codes
          </button>

          {generatedCodes.length > 0 ? (
            <div className="rounded-lg border border-black/10 bg-slate-50 p-3 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Generated</p>
                <div className="flex items-center gap-2">
                  <button onClick={copyAllGenerated} className="rounded-md border border-black/10 bg-white px-3 py-1 text-xs font-bold">Copy All</button>
                  <button onClick={exportCsv} className="rounded-md border border-black/10 bg-white px-3 py-1 text-xs font-bold">Export CSV</button>
                </div>
              </div>
              <div className="max-h-32 overflow-auto space-y-1">
                {generatedCodes.map((code) => (
                  <div key={code} className="rounded-lg bg-white px-3 py-1.5 text-sm font-bold tracking-[0.12em] text-slate-900">{code}</div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-lg border border-black/10 bg-white p-5 shadow-sm lg:col-span-2">
          <div className="flex items-center justify-between gap-3 mb-4">
            <h2 className="font-syne text-xl font-extrabold text-slate-900">All Codes</h2>
            <div className="flex items-center gap-2">
              <button onClick={loadData} className="rounded-md border border-black/10 bg-white px-3 py-1.5 text-xs font-bold inline-flex items-center gap-1"><RefreshCw className="h-3.5 w-3.5" /> Refresh</button>
              <button onClick={exportCsv} className="rounded-md border border-black/10 bg-white px-3 py-1.5 text-xs font-bold inline-flex items-center gap-1"><Download className="h-3.5 w-3.5" /> CSV</button>
            </div>
          </div>

          <div className="mb-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-2">
              {['all', 'used', 'available', 'expired'].map((item) => (
                <button
                  key={item}
                  onClick={() => setFilter(item as any)}
                  className={`rounded-md px-3 py-1.5 text-xs font-bold uppercase tracking-[0.14em] ${filter === item ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-500 border border-black/10'}`}
                >
                  {item}
                </button>
              ))}
            </div>
            <label className="relative block w-full md:w-72">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500 dark:text-slate-400 transition-colors" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search code or user"
                className="w-full rounded-md border border-black/10 py-2 pl-9 pr-3 text-sm outline-none focus:border-amber-400"
              />
            </label>
          </div>

          <div className="overflow-auto rounded-lg border border-black/10">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 h-[40px] border-b border-[rgba(15,23,42,0.08)]">
                <tr>
                  <th className="px-3 py-2 text-left px-4 text-left font-sans font-semibold text-[12px] text-slate-400 uppercase tracking-[0.6px]">Code</th>
                  <th className="px-3 py-2 text-left px-4 text-left font-sans font-semibold text-[12px] text-slate-400 uppercase tracking-[0.6px]">Created By</th>
                  <th className="px-3 py-2 text-left px-4 text-left font-sans font-semibold text-[12px] text-slate-400 uppercase tracking-[0.6px]">Used By</th>
                  <th className="px-3 py-2 text-left px-4 text-left font-sans font-semibold text-[12px] text-slate-400 uppercase tracking-[0.6px]">Status</th>
                  <th className="px-3 py-2 text-left px-4 text-left font-sans font-semibold text-[12px] text-slate-400 uppercase tracking-[0.6px]">Created</th>
                  <th className="px-3 py-2 text-left px-4 text-left font-sans font-semibold text-[12px] text-slate-400 uppercase tracking-[0.6px]">Expires</th>
                  <th className="px-3 py-2 text-right px-4 text-left font-sans font-semibold text-[12px] text-slate-400 uppercase tracking-[0.6px]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {codes.map((row) => {
                  const status = row.is_used ? 'Used' : row.isExpired ? 'Expired' : 'Available';
                  return (
                    <tr key={row.id} className="border-t border-black/10">
                      <td className="px-3 py-2 font-bold tracking-[0.1em]">{row.code}</td>
                      <td className="px-3 py-2">{row.createdByUser?.name || row.createdByUser?.email || 'Admin pool'}</td>
                      <td className="px-3 py-2">{row.usedByUser?.name || '-'}</td>
                      <td className="px-3 py-2">
                        <span className={`rounded-md px-2 py-0.5 text-[11px] font-bold ${status === 'Used' ? 'bg-slate-100 text-[#475569]' : status === 'Expired' ? 'bg-accent-red/15 text-accent-red' : 'bg-accent-green/15 text-accent-green'}`}>
                          {status}
                        </span>
                      </td>
                      <td className="px-3 py-2">{new Date(row.created_at).toLocaleDateString()}</td>
                      <td className="px-3 py-2">{row.expires_at ? new Date(row.expires_at).toLocaleDateString() : '-'}</td>
                      <td className="px-3 py-2 text-right">
                        <div className="inline-flex items-center gap-2">
                          <button
                            onClick={async () => {
                              try {
                                await navigator.clipboard.writeText(row.code);
                                toast.success('Code copied.');
                              } catch {
                                toast.error('Could not copy code.');
                              }
                            }}
                            className="rounded-md border border-black/10 bg-white px-3 py-1 text-xs font-bold"
                          >
                            Copy
                          </button>
                          {!row.is_used ? (
                            <button
                              onClick={() => handleRevoke(row.id)}
                              className="rounded-md border border-rose-200 bg-accent-red/15 px-3 py-1 text-xs font-bold text-accent-red"
                            >
                              Revoke
                            </button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {!isLoading && codes.length === 0 ? (
                  <tr>
                    <td className="px-3 py-5 text-center text-sm text-slate-500" colSpan={7}>No invite codes found.</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-lg border border-black/10 bg-white p-5 shadow-sm">
            <h3 className="font-syne text-xl font-extrabold text-slate-900">Invite Analytics</h3>
            <p className="mt-2 text-sm text-slate-500">Conversion rate: <span className="font-bold text-slate-900">{conversionRate}%</span></p>
            <div className="mt-4 space-y-2">
              {invitesPerDay.length > 0 ? invitesPerDay.map((item) => {
                const max = Math.max(...invitesPerDay.map((entry) => entry.count));
                const width = max > 0 ? (item.count / max) * 100 : 0;
                return (
                  <div key={item.day}>
                    <div className="flex items-center justify-between text-xs text-slate-500 mb-1"><span>{item.day}</span><span>{item.count}</span></div>
                    <div className="h-2 rounded-md bg-black/10">
                      <div className="h-full rounded-md bg-amber-500" style={{ width: `${width}%` }} />
                    </div>
                  </div>
                );
              }) : <p className="text-sm text-slate-500">No invite activity yet.</p>}
            </div>
          </div>

          <div className="rounded-lg border border-black/10 bg-white p-5 shadow-sm">
            <h3 className="font-syne text-xl font-extrabold text-slate-900">Top Inviters</h3>
            <div className="mt-4 space-y-2">
              {topInviters.length > 0 ? topInviters.map((item) => (
                <div key={item.id} className="rounded-lg border border-black/10 bg-slate-50 px-3 py-2.5 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-slate-900">{item.name}</p>
                    <p className="text-xs text-slate-500">{item.email}</p>
                  </div>
                  <p className="font-syne text-xl font-extrabold text-[#A16207]">{item.count}</p>
                </div>
              )) : <p className="text-sm text-slate-500">No successful invites yet.</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
