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
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-50">
            <ShieldAlert className="h-4.5 w-4.5 text-rose-600" />
          </div>
          <div>
            <h2 className="font-syne text-xl font-extrabold text-slate-900 tracking-tight">Audit Log</h2>
            <p className="text-xs text-slate-500">Immutable record of all administrative actions · Read-only</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => fetchLogs(true)}
            disabled={isRefreshing}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors shadow-sm"
          >
            <RefreshCw size={12} className={isRefreshing ? 'animate-spin' : ''} />
            Refresh
          </button>
          <button
            type="button"
            onClick={handleExport}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors shadow-sm"
          >
            <Download size={12} />
            Export CSV
          </button>
        </div>
      </div>

      {/* Immutability notice */}
      <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-5 py-3.5 shadow-sm">
        <ShieldAlert className="h-4.5 w-4.5 text-rose-600 shrink-0 mt-0.5" />
        <p className="text-sm text-rose-800">
          <strong>Immutable Audit Trail:</strong> Every administrative action is permanently logged here.
          This log cannot be modified or deleted and is used for security and compliance audits.
        </p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Search by action, admin name, or target ID…"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-900 placeholder-slate-400 focus:border-amber-400 focus:ring-2 focus:ring-amber-100 outline-none transition-all shadow-sm"
        />
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-7 w-7 animate-spin text-amber-500" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  {['Timestamp', 'Admin', 'Action Performed', 'Target Resource', 'IP Address'].map(h => (
                    <th key={h} className="px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLogs.length > 0 ? (
                  filteredLogs.map(log => {
                    const isDangerous = ACTION_DANGER_KEYS.some(k => (log.action || '').includes(k));
                    return (
                      <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-5 py-3.5 font-mono text-[11px] text-slate-400 whitespace-nowrap">
                          {new Date(log.created_at).toLocaleString()}
                        </td>
                        <td className="px-5 py-3.5 font-semibold text-slate-800">
                          {log.admin_user?.name || 'Unknown Admin'}
                        </td>
                        <td className="px-5 py-3.5">
                          <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                            isDangerous
                              ? 'border-rose-200 bg-rose-50 text-rose-700'
                              : 'border-slate-200 bg-slate-50 text-slate-600'
                          }`}>
                            {log.action}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-[12px] text-slate-500">
                          {log.target_type && <span className="font-medium text-slate-700 mr-1">{log.target_type}</span>}
                          {log.target_id && <span className="font-mono text-[11px]">({log.target_id.substring(0, 8)}…)</span>}
                        </td>
                        <td className="px-5 py-3.5 font-mono text-[11px] text-slate-400">
                          {log.ip_address || 'System'}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={5} className="px-5 py-14 text-center text-sm text-slate-400">
                      <ShieldAlert className="h-8 w-8 text-slate-200 mx-auto mb-3" />
                      {searchTerm ? 'No logs match the search.' : 'No audit logs found.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
        {!isLoading && filteredLogs.length > 0 && (
          <div className="px-5 py-3 border-t border-slate-100 bg-slate-50">
            <p className="text-[11px] text-slate-400">
              Showing {filteredLogs.length.toLocaleString()} of {logs.length.toLocaleString()} total entries
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
