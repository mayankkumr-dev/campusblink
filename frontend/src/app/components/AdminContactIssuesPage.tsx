import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Loader2, Search, Wrench, RefreshCw, Filter } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../store/authStore';
import { getContactIssues, updateContactIssueStatus } from '../../api/contact';

const STATUS_OPTIONS = ['all', 'open', 'in_progress', 'resolved'] as const;
type StatusOption = typeof STATUS_OPTIONS[number];

const STATUS_STYLES: Record<string, string> = {
  open: 'border-amber-200 bg-amber-50 text-amber-700',
  in_progress: 'border-blue-200 bg-blue-50 text-blue-700',
  resolved: 'border-emerald-200 bg-emerald-50 text-emerald-700',
};

export const AdminContactIssuesPage: React.FC = () => {
  const adminProfile = useAuthStore((state) => state.profile);
  const [issues, setIssues] = useState<any[]>([]);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusOption>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const loadIssues = async () => {
    setIsLoading(true);
    const { data, error } = await getContactIssues(statusFilter);
    if (error) {
      toast.error((error as any)?.message || 'Failed to load contact issues');
      setIssues([]);
    } else {
      setIssues(data || []);
    }
    setIsLoading(false);
  };

  useEffect(() => { loadIssues(); }, [statusFilter]);

  const filtered = useMemo(() => {
    if (!query.trim()) return issues;
    const q = query.toLowerCase();
    return issues.filter(issue =>
      [issue.name, issue.email, issue.subject, issue.message, issue.category, issue.user?.name, issue.user?.email]
        .filter(Boolean).join(' ').toLowerCase().includes(q)
    );
  }, [issues, query]);

  const setIssueStatus = async (issueId: string, nextStatus: 'in_progress' | 'resolved') => {
    if (!adminProfile?.id) return;
    setUpdatingId(issueId);
    const { error } = await updateContactIssueStatus(issueId, nextStatus, adminProfile.id);
    if (error) {
      toast.error((error as any)?.message || 'Failed to update issue');
    } else {
      toast.success(nextStatus === 'resolved' ? 'Issue marked as resolved' : 'Issue moved to in-progress');
      setIssues(prev => prev.map(i => i.id === issueId ? { ...i, status: nextStatus } : i));
    }
    setUpdatingId(null);
  };

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-50">
            <Wrench className="h-4.5 w-4.5 text-orange-600" />
          </div>
          <div>
            <h2 className="font-syne text-xl font-extrabold text-slate-900 tracking-tight">Contact Issues</h2>
            <p className="text-xs text-slate-500">User-reported issues submitted through the contact form · {issues.length} total</p>
          </div>
        </div>
        <button
          type="button"
          onClick={loadIssues}
          disabled={isLoading}
          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 shadow-sm transition-colors"
        >
          <RefreshCw size={12} className={isLoading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Search + Filters */}
      <div className="flex flex-col md:flex-row gap-3 items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search by name, email, subject, or message…"
            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-900 placeholder-slate-400 focus:border-amber-400 focus:ring-2 focus:ring-amber-100 outline-none transition-all shadow-sm"
          />
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Filter size={12} className="text-slate-400" />
          {STATUS_OPTIONS.map(status => (
            <button
              key={status}
              type="button"
              onClick={() => setStatusFilter(status)}
              className={`rounded-xl border px-3.5 py-2 text-[11px] font-bold capitalize transition-all ${
                statusFilter === status
                  ? 'bg-amber-500 border-amber-500 text-white shadow-sm shadow-amber-200'
                  : 'border-slate-200 bg-white text-slate-500 hover:border-amber-300 hover:text-amber-600'
              }`}
            >
              {status.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex h-52 items-center justify-center">
            <Loader2 className="h-7 w-7 animate-spin text-amber-500" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14 text-center">
            <CheckCircle2 className="h-10 w-10 text-emerald-400 mb-3" />
            <p className="font-semibold text-slate-500">No contact issues found.</p>
            <p className="text-sm text-slate-400 mt-1">
              {query ? 'Try adjusting your search query.' : 'No issues match the current filter.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  {['User', 'Category', 'Subject & Message', 'Status', 'Date', 'Actions'].map(h => (
                    <th key={h} className="px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map(issue => (
                  <tr key={issue.id} className="align-top hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-4">
                      <p className="font-semibold text-slate-800">{issue.name || issue.user?.name || 'Unknown'}</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">{issue.email || issue.user?.email}</p>
                    </td>
                    <td className="px-5 py-4">
                      <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-[10px] font-bold uppercase text-slate-500">
                        {issue.category || 'general'}
                      </span>
                    </td>
                    <td className="px-5 py-4 max-w-xs">
                      <p className="font-semibold text-slate-800 text-[13px] mb-1">{issue.subject || 'No subject'}</p>
                      <p className="text-[12px] text-slate-400 line-clamp-2 leading-relaxed">{issue.message}</p>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${STATUS_STYLES[issue.status || 'open'] || STATUS_STYLES.open}`}>
                        {String(issue.status || 'open').replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-[11px] text-slate-400 whitespace-nowrap">
                      {new Date(issue.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex flex-col gap-1.5">
                        {issue.status !== 'in_progress' && issue.status !== 'resolved' && (
                          <button
                            type="button"
                            disabled={updatingId === issue.id}
                            onClick={() => setIssueStatus(issue.id, 'in_progress')}
                            className="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-[10px] font-bold uppercase text-blue-700 hover:bg-blue-100 transition-colors disabled:opacity-60"
                          >
                            <Wrench className="h-3 w-3" />
                            In Progress
                          </button>
                        )}
                        {issue.status !== 'resolved' && (
                          <button
                            type="button"
                            disabled={updatingId === issue.id}
                            onClick={() => setIssueStatus(issue.id, 'resolved')}
                            className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-[10px] font-bold uppercase text-emerald-700 hover:bg-emerald-100 transition-colors disabled:opacity-60"
                          >
                            {updatingId === issue.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
                            Resolve
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!isLoading && filtered.length > 0 && (
          <div className="px-5 py-3 border-t border-slate-100 bg-slate-50">
            <p className="text-[11px] text-slate-400">
              {filtered.length} of {issues.length} issues
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
