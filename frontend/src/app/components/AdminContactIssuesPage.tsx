import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Loader2, Search, Wrench, RefreshCw, Filter } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../store/authStore';
import { getContactIssues, updateContactIssueStatus } from '../../api/contact';

const STATUS_OPTIONS = ['all', 'open', 'in_progress', 'resolved'] as const;
type StatusOption = typeof STATUS_OPTIONS[number];

const STATUS_STYLES: Record<string, string> = {
  open: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-400 transition-colors',
  in_progress: 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-400 transition-colors',
  resolved: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400 transition-colors',
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
    <div className="space-y-5 transition-colors pb-8">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-50 dark:bg-orange-500/10 transition-colors">
            <Wrench className="h-4.5 w-4.5 text-orange-600 dark:text-orange-400 transition-colors" />
          </div>
          <div>
            <h2 className="font-syne text-xl font-extrabold text-slate-900 dark:text-text-primary tracking-tight transition-colors">Contact Issues</h2>
            <p className="text-xs text-slate-500 dark:text-text-secondary transition-colors">User-reported issues submitted through the contact form · {issues.length} total</p>
          </div>
        </div>
        <button
          type="button"
          onClick={loadIssues}
          disabled={isLoading}
          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-border-subtle bg-white dark:bg-surface px-4 py-2 text-xs font-bold text-slate-600 dark:text-text-secondary hover:bg-slate-50 dark:hover:bg-surface-elevated shadow-sm dark:shadow-none transition-colors disabled:opacity-50"
        >
          <RefreshCw size={12} className={isLoading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Search + Filters */}
      <div className="flex flex-col md:flex-row gap-3 items-center transition-colors">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-text-secondary transition-colors" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search by name, email, subject, or message…"
            className="w-full rounded-xl border border-slate-200 dark:border-border-subtle bg-white dark:bg-surface py-2.5 pl-10 pr-4 text-sm text-slate-900 dark:text-text-primary placeholder-slate-400 dark:placeholder:text-text-secondary focus:border-amber-400 dark:focus:border-amber-500 focus:ring-2 focus:ring-amber-100 dark:focus:ring-amber-500/20 outline-none transition-all shadow-sm dark:shadow-none"
          />
        </div>
        <div className="flex items-center gap-2 shrink-0 overflow-x-auto hide-scrollbar pb-1 -mx-4 px-4 md:mx-0 md:px-0 w-full md:w-auto">
          <Filter size={12} className="text-slate-400 dark:text-text-secondary shrink-0 hidden md:block transition-colors" />
          {STATUS_OPTIONS.map(status => (
            <button
              key={status}
              type="button"
              onClick={() => setStatusFilter(status)}
              className={`shrink-0 rounded-full md:rounded-xl border px-4 py-2 md:px-3.5 md:py-2 text-[11px] font-bold capitalize transition-all ${
                statusFilter === status
                  ? 'bg-amber-500 dark:bg-amber-500 border-amber-500 dark:border-amber-500 text-white dark:text-slate-950 shadow-sm shadow-amber-200 dark:shadow-none'
                  : 'border-slate-200 dark:border-border-subtle bg-white dark:bg-surface text-slate-500 dark:text-text-secondary hover:border-amber-300 dark:hover:border-amber-500/50 hover:text-amber-600 dark:hover:text-amber-400'
              }`}
            >
              {status.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-slate-200 dark:border-border-subtle bg-white dark:bg-surface shadow-sm dark:shadow-none overflow-hidden transition-colors">
        {isLoading ? (
          <div className="flex h-52 items-center justify-center">
            <Loader2 className="h-7 w-7 animate-spin text-amber-500 dark:text-amber-400 transition-colors" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14 text-center transition-colors">
            <CheckCircle2 className="h-10 w-10 text-emerald-400 dark:text-emerald-500 mb-3 transition-colors" />
            <p className="font-semibold text-slate-500 dark:text-text-primary transition-colors">No contact issues found.</p>
            <p className="text-sm text-slate-400 dark:text-text-secondary mt-1 transition-colors">
              {query ? 'Try adjusting your search query.' : 'No issues match the current filter.'}
            </p>
          </div>
        ) : (
          <>
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 dark:bg-surface-elevated border-b border-slate-100 dark:border-border-subtle">
                  <tr>
                    {['User', 'Category', 'Subject & Message', 'Status', 'Date', 'Actions'].map(h => (
                      <th key={h} className="px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-text-secondary">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-border-subtle">
                  {filtered.map(issue => (
                    <tr key={issue.id} className="align-top hover:bg-slate-50 dark:hover:bg-surface-elevated/70 transition-colors">
                      <td className="px-5 py-4">
                        <p className="font-semibold text-slate-800 dark:text-text-primary">{issue.name || issue.user?.name || 'Unknown'}</p>
                        <p className="text-[11px] text-slate-400 dark:text-text-secondary mt-0.5">{issue.email || issue.user?.email}</p>
                      </td>
                      <td className="px-5 py-4">
                        <span className="rounded-full border border-slate-200 dark:border-border-subtle bg-slate-50 dark:bg-surface-elevated px-2.5 py-0.5 text-[10px] font-bold uppercase text-slate-500 dark:text-text-secondary">
                          {issue.category || 'general'}
                        </span>
                      </td>
                      <td className="px-5 py-4 max-w-xs">
                        <p className="font-semibold text-slate-800 dark:text-text-primary text-[13px] mb-1">{issue.subject || 'No subject'}</p>
                        <p className="text-[12px] text-slate-400 dark:text-text-secondary line-clamp-2 leading-relaxed">{issue.message}</p>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${STATUS_STYLES[issue.status || 'open'] || STATUS_STYLES.open}`}>
                          {String(issue.status || 'open').replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-[11px] text-slate-400 dark:text-text-secondary whitespace-nowrap">
                        {new Date(issue.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex flex-col gap-1.5">
                          {issue.status !== 'in_progress' && issue.status !== 'resolved' && (
                            <button
                              type="button"
                              disabled={updatingId === issue.id}
                              onClick={() => setIssueStatus(issue.id, 'in_progress')}
                              className="inline-flex items-center gap-1 rounded-lg border border-blue-200 dark:border-blue-500/20 bg-blue-50 dark:bg-blue-500/10 px-2.5 py-1.5 text-[10px] font-bold uppercase text-blue-700 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-500/20 transition-colors disabled:opacity-60"
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
                              className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 dark:border-emerald-500/20 bg-emerald-50 dark:bg-emerald-500/10 px-2.5 py-1.5 text-[10px] font-bold uppercase text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 transition-colors disabled:opacity-60"
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

            {/* Mobile Cards */}
            <div className="md:hidden space-y-3 p-4 bg-slate-50/50 dark:bg-background/50 transition-colors">
              {filtered.map(issue => (
                <div key={issue.id} className="rounded-2xl border border-slate-200 dark:border-border-subtle bg-white dark:bg-surface p-4 shadow-[0_2px_12px_rgba(0,0,0,0.03)] dark:shadow-none flex flex-col gap-3 transition-colors">
                  {/* Header */}
                  <div className="flex items-center justify-between gap-3 border-b border-slate-100 dark:border-border-subtle pb-3 transition-colors">
                    <p className="font-bold text-slate-900 dark:text-text-primary text-sm truncate transition-colors">
                      {issue.name || issue.user?.name || 'Unknown'}
                    </p>
                    <span className="shrink-0 rounded-full border border-slate-200 dark:border-border-subtle bg-slate-50 dark:bg-surface-elevated px-2.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-text-secondary transition-colors">
                      {issue.category || 'general'}
                    </span>
                  </div>
                  
                  {/* Body */}
                  <div>
                    <p className="font-syne font-bold text-slate-800 dark:text-text-primary text-[13px] mb-1.5 transition-colors">{issue.subject || 'No subject'}</p>
                    <p className="text-[11px] text-slate-500 dark:text-text-secondary line-clamp-3 leading-relaxed transition-colors">{issue.message}</p>
                  </div>
                  
                  {/* Footer */}
                  <div className="flex flex-col gap-3 pt-3 border-t border-slate-100 dark:border-border-subtle mt-1 transition-colors">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-text-secondary transition-colors">
                        {new Date(issue.created_at).toLocaleDateString()}
                      </span>
                      <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wider ${STATUS_STYLES[issue.status || 'open'] || STATUS_STYLES.open}`}>
                        {String(issue.status || 'open').replace('_', ' ')}
                      </span>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      {issue.status !== 'in_progress' && issue.status !== 'resolved' && (
                        <button
                          type="button"
                          disabled={updatingId === issue.id}
                          onClick={() => setIssueStatus(issue.id, 'in_progress')}
                          className="flex-1 inline-flex justify-center items-center gap-1 rounded-xl border border-blue-200 dark:border-blue-500/20 bg-blue-50 dark:bg-blue-500/10 px-2.5 py-2.5 text-[10px] font-bold uppercase text-blue-700 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-500/20 transition-colors disabled:opacity-60"
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
                          className="flex-1 inline-flex justify-center items-center gap-1 rounded-xl border border-emerald-200 dark:border-emerald-500/20 bg-emerald-50 dark:bg-emerald-500/10 px-2.5 py-2.5 text-[10px] font-bold uppercase text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 transition-colors disabled:opacity-60"
                        >
                          {updatingId === issue.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
                          Resolve
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
        {!isLoading && filtered.length > 0 && (
          <div className="px-5 py-3 border-t border-slate-100 dark:border-border-subtle bg-slate-50 dark:bg-surface-elevated">
            <p className="text-[11px] text-slate-400 dark:text-text-secondary">
              {filtered.length} of {issues.length} issues
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
