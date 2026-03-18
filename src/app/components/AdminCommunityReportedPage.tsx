import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Loader2, Search, ShieldAlert, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { getCommunityReports, resolveReport } from '../../api/admin';
import { useAuthStore } from '../../store/authStore';

function displayUser(user: any) {
  if (!user) return 'Unknown user';
  if (user.name) return user.name;
  if (user.username) return `@${user.username}`;
  return user.email || 'Unknown user';
}

export const AdminCommunityReportedPage: React.FC = () => {
  const adminProfile = useAuthStore((state) => state.profile);
  const [reports, setReports] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'pending' | 'reviewed' | 'all'>('pending');

  const loadReports = async () => {
    setIsLoading(true);
    const { data, error } = await getCommunityReports(statusFilter);
    if (error) {
      toast.error((error as any)?.message || 'Failed to load reports.');
      setReports([]);
    } else {
      setReports(data || []);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadReports();
  }, [statusFilter]);

  const filteredReports = useMemo(() => {
    const search = query.toLowerCase();
    if (!search) return reports;

    return reports.filter((report) => {
      const haystack = [
        report.reason,
        report.description,
        report.target_type,
        report.status,
        report.target_post?.content,
        report.reporter?.name,
        report.reporter?.email,
        report.target_account?.name,
        report.target_account?.email,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return haystack.includes(search);
    });
  }, [reports, query]);

  const handleResolve = async (reportId: string, verdict: 'reviewed' | 'ignored') => {
    if (!adminProfile?.id) return;

    const loadingToast = toast.loading(verdict === 'ignored' ? 'Ignoring report...' : 'Marking report reviewed...');
    const { error } = await resolveReport(adminProfile.id, reportId, verdict);

    if (error) {
      toast.error((error as any)?.message || 'Failed to update report.', { id: loadingToast });
      return;
    }

    toast.success(verdict === 'ignored' ? 'Report ignored.' : 'Report marked as reviewed.', { id: loadingToast });
    setReports((prev) => prev.filter((report) => report.id !== reportId));
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="rounded-lg border border-black/[0.08] bg-white p-4">
        <h2 className="font-syne text-xl font-bold text-[#0D0D0D]">Reported Posts & Accounts</h2>
        <p className="mt-1 text-xs uppercase tracking-wider text-[#6B6B6B]">See who reported whom and decide whether to review or ignore</p>
      </div>

      <div className="flex flex-col gap-3 rounded-lg border border-black/[0.08] bg-white p-4 md:flex-row md:items-center md:justify-between">
        <div className="relative w-full md:max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6B6B6B]" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by reporter, target, reason..."
            className="w-full rounded-lg border border-black/10 bg-[#F7F5F0] py-2 pl-9 pr-3 text-sm text-[#0D0D0D] outline-none focus:border-[#FFD600]"
          />
        </div>

        <div className="flex items-center gap-2">
          {(['pending', 'reviewed', 'all'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold uppercase tracking-wider ${statusFilter === status ? 'bg-[#FFD600] text-[#0D0D0D]' : 'border border-black/10 bg-[#F7F5F0] text-[#6B6B6B]'}`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-black/[0.08] bg-white">
        {isLoading ? (
          <div className="flex h-52 items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-[#FFD600]" /></div>
        ) : filteredReports.length === 0 ? (
          <div className="p-10 text-center text-sm text-[#6B6B6B]">No reports found for the selected filter.</div>
        ) : (
          <table className="w-full border-collapse text-left">
            <thead className="bg-[#F5F4F0] h-[40px] border-b border-[#E8E8E8]">
              <tr className="border-b border-black/[0.08] bg-[#F7F5F0] hover:bg-[#FAFAF8] transition-colors duration-150">
                <th className="p-4 text-xs font-bold uppercase tracking-wider text-[#6B6B6B] px-4 text-left font-sans font-semibold text-[12px] text-[#9B9B9B] uppercase tracking-[0.6px]">Who Reported Whom</th>
                <th className="p-4 text-xs font-bold uppercase tracking-wider text-[#6B6B6B] px-4 text-left font-sans font-semibold text-[12px] text-[#9B9B9B] uppercase tracking-[0.6px]">Type</th>
                <th className="p-4 text-xs font-bold uppercase tracking-wider text-[#6B6B6B] px-4 text-left font-sans font-semibold text-[12px] text-[#9B9B9B] uppercase tracking-[0.6px]">Reason</th>
                <th className="p-4 text-xs font-bold uppercase tracking-wider text-[#6B6B6B] px-4 text-left font-sans font-semibold text-[12px] text-[#9B9B9B] uppercase tracking-[0.6px]">Context</th>
                <th className="p-4 text-xs font-bold uppercase tracking-wider text-[#6B6B6B] px-4 text-left font-sans font-semibold text-[12px] text-[#9B9B9B] uppercase tracking-[0.6px]">Date</th>
                <th className="p-4 text-xs font-bold uppercase tracking-wider text-[#6B6B6B] px-4 text-left font-sans font-semibold text-[12px] text-[#9B9B9B] uppercase tracking-[0.6px]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/[0.06]">
              {filteredReports.map((report) => {
                const reporterName = displayUser(report.reporter);
                const targetName = displayUser(report.target_account);
                return (
                  <tr key={report.id} className="align-top hover:bg-[#FAFAF8]">
                    <td className="p-4 text-sm">
                      <p className="font-bold text-[#0D0D0D]">{reporterName}</p>
                      <p className="text-[11px] text-[#9B9B9B]">Reporter ID: {report.reporter_id}</p>
                      <p className="text-xs text-[#6B6B6B]">reported</p>
                      <p className="font-bold text-[#0D0D0D]">{targetName}</p>
                      <p className="text-[11px] text-[#9B9B9B]">Target ID: {report.target_id}</p>
                    </td>
                    <td className="p-4 text-xs font-bold uppercase tracking-wider text-[#0D0D0D]">
                      <span className={`rounded px-2 py-1 ${report.target_type === 'post' ? 'bg-[#FEF3C7] text-[#92400E]' : 'bg-[#DBEAFE] text-[#1D4ED8]'}`}>
                        {report.target_type === 'post' ? 'Post' : 'Account'}
                      </span>
                    </td>
                    <td className="p-4">
                      <p className="text-sm font-bold text-[#0D0D0D]">{report.reason || 'No reason provided'}</p>
                      {report.description ? <p className="mt-1 text-xs text-[#6B6B6B]">{report.description}</p> : null}
                    </td>
                    <td className="max-w-sm p-4 text-xs text-[#6B6B6B]">
                      {report.target_type === 'post' ? (
                        <>
                          <p className="font-bold text-[#0D0D0D]">Post ID: {report.target_id}</p>
                          <p className="mt-1 line-clamp-3">{report.target_post?.content || 'Post not found'}</p>
                        </>
                      ) : (
                        <p>Account ID: {report.target_id}</p>
                      )}
                    </td>
                    <td className="p-4 text-xs text-[#6B6B6B]">{new Date(report.created_at).toLocaleString()}</td>
                    <td className="p-4">
                      {report.status === 'reviewed' ? (
                        <span className="inline-flex items-center gap-1 rounded bg-[#DCFCE7] px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-[#166534]">
                          <CheckCircle2 className="h-3 w-3" /> Reviewed
                        </span>
                      ) : (
                        <div className="flex flex-col gap-2">
                          <button
                            onClick={() => handleResolve(report.id, 'reviewed')}
                            className="inline-flex items-center gap-1 rounded bg-[#DCFCE7] px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-[#166534]"
                          >
                            <ShieldAlert className="h-3.5 w-3.5" /> Review
                          </button>
                          <button
                            onClick={() => handleResolve(report.id, 'ignored')}
                            className="inline-flex items-center gap-1 rounded bg-[#F7F5F0] px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-[#6B6B6B]"
                          >
                            <XCircle className="h-3.5 w-3.5" /> Ignore
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
