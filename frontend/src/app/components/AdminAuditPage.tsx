import React, { useState, useEffect } from 'react';
import { Search, ShieldAlert, RefreshCw, Loader2, Download } from 'lucide-react';
import { getAuditLogs } from '../../api/admin';
import toast from 'react-hot-toast';

const ACTION_DANGER_KEYS = ['BAN', 'SUSPEND', 'DELETE', 'REJECT', 'REVOKE'];

export const AdminAuditPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [logs, setLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => { fetchLogs(); }, []);

  const fetchLogs = async (silent = false) => {
    if (silent) setIsRefreshing(true);
    else setIsLoading(true);

    const { data } = await getAuditLogs();
    if (data) setLogs(data);

    setIsLoading(false);
    setIsRefreshing(false);
  };

  const filteredLogs = logs.filter(log => {
    const q = searchTerm.toLowerCase();
    return `${log.action} ${log.target_type} ${log.target_id} ${log.admin_user?.name || ''}`.toLowerCase().includes(q);
  });

  const handleExport = () => {
    if (filteredLogs.length === 0) { toast.error('No logs to export'); return; }
    const header = ['Timestamp', 'Admin', 'Action', 'Target Type', 'Target ID', 'IP'];
    const rows = filteredLogs.map(l => [
      new Date(l.created_at).toLocaleString(),
      l.admin_user?.name || 'Unknown',
      l.action,
      l.target_type || '',
      l.target_id || '',
      l.ip_address || 'System',
    ]);
    const csv = [header, ...rows].map(r => r.map(v => `"${v}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `audit-log-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    toast.success('Audit log exported');
  };

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-50 dark:bg-rose-500/10 transition-colors">
            <ShieldAlert className="h-4.5 w-4.5 text-rose-600 dark:text-rose-400 transition-colors" />
          </div>
          <div>
            <h2 className="font-syne text-xl font-extrabold text-slate-900 dark:text-admin-text-primary tracking-tight transition-colors">Audit Log</h2>
            <p className="text-xs text-slate-500 dark:text-admin-text-tertiary transition-colors">Immutable record of all administrative actions · Read-only</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => fetchLogs(true)}
            disabled={isRefreshing}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-admin-border-subtle bg-white dark:bg-admin-bg-surface px-3.5 py-2 text-xs font-bold text-slate-600 dark:text-admin-text-primary hover:bg-slate-50 dark:hover:bg-admin-bg-surface-hover transition-colors shadow-sm dark:shadow-none"
          >
            <RefreshCw size={12} className={isRefreshing ? 'animate-spin' : ''} />
            Refresh
          </button>
          <button
            type="button"
            onClick={handleExport}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-admin-border-subtle bg-white dark:bg-admin-bg-surface px-3.5 py-2 text-xs font-bold text-slate-600 dark:text-admin-text-primary hover:bg-slate-50 dark:hover:bg-admin-bg-surface-hover transition-colors shadow-sm dark:shadow-none"
          >
            <Download size={12} />
            Export CSV
          </button>
        </div>
      </div>

      {/* Immutability notice */}
      <div className="flex items-start gap-3 rounded-2xl border border-rose-200 dark:border-rose-500/20 bg-rose-50 dark:bg-rose-500/10 px-5 py-3.5 shadow-sm dark:shadow-none transition-colors">
        <ShieldAlert className="h-4.5 w-4.5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5 transition-colors" />
        <p className="text-sm text-rose-800 dark:text-rose-300 transition-colors">
          <strong>Immutable Audit Trail:</strong> Every administrative action is permanently logged here.
          This log cannot be modified or deleted and is used for security and compliance audits.
        </p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-admin-text-tertiary transition-colors" />
        <input
          type="text"
          placeholder="Search by action, admin name, or target ID…"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="w-full rounded-xl border border-slate-200 dark:border-admin-border-subtle bg-white dark:bg-admin-bg-surface-raised py-2.5 pl-10 pr-4 text-sm text-slate-900 dark:text-admin-text-primary placeholder-slate-400 dark:placeholder-admin-text-tertiary focus:border-amber-400 dark:focus:border-admin-accent focus:ring-2 focus:ring-amber-100 outline-none transition-all shadow-sm dark:shadow-none"
        />
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-slate-200 dark:border-admin-border-subtle bg-white dark:bg-admin-bg-surface shadow-sm dark:shadow-none overflow-hidden transition-colors">
        {isLoading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-7 w-7 animate-spin text-amber-500 dark:text-amber-400 transition-colors" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 dark:bg-admin-bg-surface-raised border-b border-slate-100 dark:border-admin-border-subtle transition-colors">
                <tr>
                  {['Timestamp', 'Admin', 'Action Performed', 'Target Resource', 'IP Address'].map(h => (
                    <th key={h} className="px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-admin-text-tertiary transition-colors">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-admin-border-subtle transition-colors">
                {filteredLogs.length > 0 ? (
                  filteredLogs.map(log => {
                    const isDangerous = ACTION_DANGER_KEYS.some(k => (log.action || '').includes(k));
                    return (
                      <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-admin-bg-surface-hover transition-colors">
                        <td className="px-5 py-3.5 font-mono text-[11px] text-slate-400 dark:text-admin-text-tertiary whitespace-nowrap transition-colors">
                          {new Date(log.created_at).toLocaleString()}
                        </td>
                        <td className="px-5 py-3.5 font-semibold text-slate-800 dark:text-admin-text-primary transition-colors">
                          {log.admin_user?.name || 'Unknown Admin'}
                        </td>
                        <td className="px-5 py-3.5">
                          <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider transition-colors ${
                            isDangerous
                              ? 'border-rose-200 dark:border-rose-500/20 bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400'
                              : 'border-slate-200 dark:border-admin-border-subtle bg-slate-50 dark:bg-admin-bg-surface-raised text-slate-600 dark:text-admin-text-secondary'
                          }`}>
                            {log.action}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-[12px] text-slate-500 dark:text-admin-text-secondary transition-colors">
                          {log.target_type && <span className="font-medium text-slate-700 dark:text-admin-text-primary mr-1 transition-colors">{log.target_type}</span>}
                          {log.target_id && <span className="font-mono text-[11px] text-slate-400 dark:text-admin-text-tertiary">({log.target_id.substring(0, 8)}…)</span>}
                        </td>
                        <td className="px-5 py-3.5 font-mono text-[11px] text-slate-400 dark:text-admin-text-tertiary whitespace-nowrap transition-colors">
                          {log.ip_address || 'System'}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={5} className="px-5 py-14 text-center text-sm text-slate-400 dark:text-admin-text-tertiary">
                      <ShieldAlert className="h-8 w-8 text-slate-200 dark:text-admin-border-subtle mx-auto mb-3" />
                      {searchTerm ? 'No logs match the search.' : 'No audit logs found.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
        {!isLoading && filteredLogs.length > 0 && (
          <div className="px-5 py-3 border-t border-slate-100 dark:border-admin-border-subtle bg-slate-50 dark:bg-admin-bg-surface-raised transition-colors">
            <p className="text-[11px] text-slate-400 dark:text-admin-text-tertiary">
              Showing {filteredLogs.length.toLocaleString()} of {logs.length.toLocaleString()} total entries
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
