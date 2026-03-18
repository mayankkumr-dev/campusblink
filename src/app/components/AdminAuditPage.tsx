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
      
      <div className="bg-[#DC2626]/10 border border-[#FF3D57]/30 rounded-lg p-4 flex items-start gap-4 mb-6">
         <ShieldAlert className="w-6 h-6 text-[#DC2626] shrink-0 mt-0.5" />
         <div>
           <h3 className="font-syne font-bold text-[#DC2626] mb-1">Immutable Audit Trail</h3>
           <p className="font-sans text-sm text-[#0D0D0D]/80">Every administrative action is permanently logged here. This log cannot be modified or deleted. Used for security and compliance audits.</p>
         </div>
      </div>

      {/* Controllers */}
      <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-4 bg-white p-4 rounded-lg border border-black/[0.08]">
        <div className="relative w-full lg:w-96 group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B6B6B] group-focus-within:text-[#FFD600] transition-colors" />
          <input 
            type="text" 
            placeholder="Search action, admin, or target..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#F7F5F0] border border-black/10 rounded-lg py-2 pl-9 pr-4 text-sm text-[#0D0D0D] placeholder-[#6B6B6B] focus:outline-none focus:border-[#FFD600]/50 transition-colors"
          />
        </div>

        <button onClick={fetchLogs} className="flex items-center gap-2 px-4 py-2 bg-[#F7F5F0] text-[#0D0D0D] border border-black/10 rounded-lg hover:bg-[#F7F5F0] transition-colors text-sm font-bold">
          <ListFilter className="w-4 h-4" /> Refresh Logs
        </button>
      </div>

      {/* Log Table */}
      <div className="bg-white border border-black/[0.08] rounded-lg overflow-x-auto min-h-[400px]">
        {isLoading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-[#FFD600]" />
          </div>
        ) : (
        <table className="w-full text-left border-collapse">
          <thead className="bg-[#F5F4F0] h-[40px] border-b border-[#E8E8E8]">
            <tr className="border-b border-black/[0.08] bg-[#F7F5F0] hover:bg-[#FAFAF8] transition-colors duration-150">
              <th className="p-4 text-xs font-bold text-[#6B6B6B] uppercase tracking-wider font-sans px-4 text-left font-sans font-semibold text-[12px] text-[#9B9B9B] uppercase tracking-[0.6px]">Timestamp</th>
              <th className="p-4 text-xs font-bold text-[#6B6B6B] uppercase tracking-wider font-sans px-4 text-left font-sans font-semibold text-[12px] text-[#9B9B9B] uppercase tracking-[0.6px]">Admin Name</th>
              <th className="p-4 text-xs font-bold text-[#6B6B6B] uppercase tracking-wider font-sans px-4 text-left font-sans font-semibold text-[12px] text-[#9B9B9B] uppercase tracking-[0.6px]">Action Perfomed</th>
              <th className="p-4 text-xs font-bold text-[#6B6B6B] uppercase tracking-wider font-sans px-4 text-left font-sans font-semibold text-[12px] text-[#9B9B9B] uppercase tracking-[0.6px]">Target Resource</th>
              <th className="p-4 text-xs font-bold text-[#6B6B6B] uppercase tracking-wider font-sans font-mono px-4 text-left font-sans font-semibold text-[12px] text-[#9B9B9B] uppercase tracking-[0.6px]">IP Address</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black/[0.06]">
            {filteredLogs.map(log => (
               <tr key={log.id} className="hover:bg-black/[0.03] transition-colors">
                  <td className="p-4 font-mono text-xs text-[#6B6B6B]">{new Date(log.created_at).toLocaleString()}</td>
                  <td className="p-4 font-sans font-bold text-sm text-[#0D0D0D]">{log.admin_user?.name || 'Unknown Admin'}</td>
                  <td className="p-4">
                     <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider ${log.action.includes('BAN') || log.action.includes('SUSPEND') || log.action.includes('DELETE') ? 'bg-[#FEE2E2] text-[#DC2626]' : 'bg-[#F7F5F0] text-[#0D0D0D]'}`}>
                       {log.action}
                     </span>
                  </td>
                  <td className="p-4 font-sans text-sm text-[#6B6B6B]">{log.target_type} ({log.target_id.substring(0,6)}...) {log.details}</td>
                  <td className="p-4 font-mono text-xs text-[#AAAAAA]">{log.ip_address || 'System'}</td>
               </tr>
            ))}
            {filteredLogs.length === 0 && (
              <tr>
                <td colSpan={5} className="p-8 text-center text-[#6B6B6B] font-sans">
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
