import React, { useState, useEffect } from 'react';
import { Search, ListFilter, ShieldAlert, AlertTriangle, Loader2 } from 'lucide-react';
import { getAuditLogs } from '../../api/admin';

export const AdminAuditPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [logs, setLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    setIsLoading(true);
    const { data } = await getAuditLogs();
    if (data) setLogs(data);
    setIsLoading(false);
  };

  const filteredLogs = logs.filter(log => {
    const searchStr = `${log.action} ${log.target_type} ${log.target_id} ${log.details} ${log.admin_user?.name}`.toLowerCase();
    return searchStr.includes(searchTerm.toLowerCase());
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      <div className="bg-[#DC2626]/10 border border-[var(--error)]/30 rounded-lg p-4 flex items-start gap-4 mb-6">
         <ShieldAlert className="w-6 h-6 text-[#DC2626] shrink-0 mt-0.5" />
         <div>
           <h3 className="font-syne font-bold text-[#DC2626] mb-1">Immutable Audit Trail</h3>
           <p className="font-sans text-sm text-[var(--text-primary)]/80">Every administrative action is permanently logged here. This log cannot be modified or deleted. Used for security and compliance audits.</p>
         </div>
      </div>

      {/* Controllers */}
      <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-4 bg-[var(--bg)] p-4 rounded-lg border border-black/[0.08]">
        <div className="relative w-full lg:w-96 group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-secondary)] group-focus-within:text-[var(--yellow)] transition-colors" />
          <input 
            type="text" 
            placeholder="Search action, admin, or target..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[var(--bg-tertiary)] border border-black/10 rounded-lg py-2 pl-9 pr-4 text-sm text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:outline-none focus:border-[var(--yellow)]/50 transition-colors"
          />
        </div>

        <button onClick={fetchLogs} className="flex items-center gap-2 px-4 py-2 bg-[var(--bg-tertiary)] text-[var(--text-primary)] border border-black/10 rounded-lg hover:bg-[var(--bg-tertiary)] transition-colors text-sm font-bold">
          <ListFilter className="w-4 h-4" /> Refresh Logs
        </button>
      </div>

      {/* Log Table */}
      <div className="bg-[var(--bg)] border border-black/[0.08] rounded-lg overflow-x-auto min-h-[400px]">
        {isLoading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-[var(--yellow)]" />
          </div>
        ) : (
        <table className="w-full text-left border-collapse">
          <thead className="bg-[var(--bg-secondary)] h-[40px] border-b border-[var(--border)]">
            <tr className="border-b border-black/[0.08] bg-[var(--bg-tertiary)] hover:bg-[var(--bg-primary)] transition-colors duration-150">
              <th className="p-4 text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider font-sans px-4 text-left font-sans font-semibold text-[12px] text-[var(--text-muted)] uppercase tracking-[0.6px]">Timestamp</th>
              <th className="p-4 text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider font-sans px-4 text-left font-sans font-semibold text-[12px] text-[var(--text-muted)] uppercase tracking-[0.6px]">Admin Name</th>
              <th className="p-4 text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider font-sans px-4 text-left font-sans font-semibold text-[12px] text-[var(--text-muted)] uppercase tracking-[0.6px]">Action Perfomed</th>
              <th className="p-4 text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider font-sans px-4 text-left font-sans font-semibold text-[12px] text-[var(--text-muted)] uppercase tracking-[0.6px]">Target Resource</th>
              <th className="p-4 text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider font-sans font-mono px-4 text-left font-sans font-semibold text-[12px] text-[var(--text-muted)] uppercase tracking-[0.6px]">IP Address</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black/[0.06]">
            {filteredLogs.map(log => (
               <tr key={log.id} className="hover:bg-black/[0.03] transition-colors">
                  <td className="p-4 font-mono text-xs text-[var(--text-secondary)]">{new Date(log.created_at).toLocaleString()}</td>
                  <td className="p-4 font-sans font-bold text-sm text-[var(--text-primary)]">{log.admin_user?.name || 'Unknown Admin'}</td>
                  <td className="p-4">
                     <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider ${log.action.includes('BAN') || log.action.includes('SUSPEND') || log.action.includes('DELETE') ? 'bg-[#FEE2E2] text-[#DC2626]' : 'bg-[var(--bg-tertiary)] text-[var(--text-primary)]'}`}>
                       {log.action}
                     </span>
                  </td>
                  <td className="p-4 font-sans text-sm text-[var(--text-secondary)]">{log.target_type} ({log.target_id.substring(0,6)}...) {log.details}</td>
                  <td className="p-4 font-mono text-xs text-[var(--text-muted)]">{log.ip_address || 'System'}</td>
               </tr>
            ))}
            {filteredLogs.length === 0 && (
              <tr>
                <td colSpan={5} className="p-8 text-center text-[var(--text-secondary)] font-sans">
                  No audit logs found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        )}
      </div>

    </div>
  );
};
