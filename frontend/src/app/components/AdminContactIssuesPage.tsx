import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Loader2, Search, Wrench } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../store/authStore';
import { getContactIssues, updateContactIssueStatus } from '../../api/contact';

const STATUS_OPTIONS = ['all', 'open', 'in_progress', 'resolved'] as const;

export const AdminContactIssuesPage: React.FC = () => {
  const adminProfile = useAuthStore((state) => state.profile);
  const [issues, setIssues] = useState<any[]>([]);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_OPTIONS)[number]>('all');
  const [isLoading, setIsLoading] = useState(true);

  const loadIssues = async () => {
    setIsLoading(true);
    const { data, error } = await getContactIssues(statusFilter);
    if (error) {
      toast.error((error as any)?.message || 'Failed to load contact issues.');
      setIssues([]);
    } else {
      setIssues(data || []);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadIssues();
  }, [statusFilter]);

  const filtered = useMemo(() => {
    if (!query.trim()) return issues;
    const search = query.toLowerCase();

    return issues.filter((issue) => {
      const haystack = [
        issue.name,
        issue.email,
        issue.subject,
        issue.message,
        issue.category,
        issue.status,
        issue.user?.name,
        issue.user?.email,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return haystack.includes(search);
    });
  }, [issues, query]);

  const setIssueStatus = async (issueId: string, nextStatus: 'in_progress' | 'resolved') => {
    if (!adminProfile?.id) return;

    const loadingToast = toast.loading(nextStatus === 'resolved' ? 'Resolving issue...' : 'Marking in progress...');
    const { error } = await updateContactIssueStatus(issueId, nextStatus, adminProfile.id);

    if (error) {
      toast.error((error as any)?.message || 'Failed to update issue.', { id: loadingToast });
      return;
    }

    toast.success(nextStatus === 'resolved' ? 'Issue resolved.' : 'Issue moved to in-progress.', { id: loadingToast });
    setIssues((prev) => prev.map((issue) => (issue.id === issueId ? { ...issue, status: nextStatus, handled_by: adminProfile.id } : issue)));
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="rounded-lg border border-black/[0.08] bg-[var(--bg)] p-4">
        <h2 className="font-syne text-xl font-bold text-[var(--text-primary)]">Contact Issues</h2>
        <p className="mt-1 text-xs uppercase tracking-wider text-[var(--text-secondary)]">Users submit problems from the Contact page</p>
      </div>

      <div className="flex flex-col gap-3 rounded-lg border border-black/[0.08] bg-[var(--bg)] p-4 md:flex-row md:items-center md:justify-between">
        <div className="relative w-full md:max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-secondary)]" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search name, email, message..."
            className="w-full rounded-lg border border-black/10 bg-[var(--bg-tertiary)] py-2 pl-9 pr-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--yellow)]"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {STATUS_OPTIONS.map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold uppercase tracking-wider ${statusFilter === status ? 'bg-[var(--yellow)] text-[var(--text-primary)]' : 'border border-black/10 bg-[var(--bg-tertiary)] text-[var(--text-secondary)]'}`}
            >
              {status.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-black/[0.08] bg-[var(--bg)]">
        {isLoading ? (
          <div className="flex h-52 items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-[var(--yellow)]" /></div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center text-sm text-[var(--text-secondary)]">No contact issues found.</div>
        ) : (
          <table className="w-full border-collapse text-left">
            <thead className="bg-[var(--bg-secondary)] h-[40px] border-b border-[var(--border)]">
              <tr className="border-b border-black/[0.08] bg-[var(--bg-tertiary)] hover:bg-[var(--bg-primary)] transition-colors duration-150">
                <th className="p-4 text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] px-4 text-left font-sans font-semibold text-[12px] text-[var(--text-muted)] uppercase tracking-[0.6px]">User</th>
                <th className="p-4 text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] px-4 text-left font-sans font-semibold text-[12px] text-[var(--text-muted)] uppercase tracking-[0.6px]">Category</th>
                <th className="p-4 text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] px-4 text-left font-sans font-semibold text-[12px] text-[var(--text-muted)] uppercase tracking-[0.6px]">Issue</th>
                <th className="p-4 text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] px-4 text-left font-sans font-semibold text-[12px] text-[var(--text-muted)] uppercase tracking-[0.6px]">Status</th>
                <th className="p-4 text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] px-4 text-left font-sans font-semibold text-[12px] text-[var(--text-muted)] uppercase tracking-[0.6px]">Created</th>
                <th className="p-4 text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] px-4 text-left font-sans font-semibold text-[12px] text-[var(--text-muted)] uppercase tracking-[0.6px]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/[0.06]">
              {filtered.map((issue) => (
                <tr key={issue.id} className="align-top hover:bg-[var(--bg-primary)]">
                  <td className="p-4 text-sm">
                    <p className="font-bold text-[var(--text-primary)]">{issue.name || issue.user?.name || 'Unknown user'}</p>
                    <p className="text-xs text-[var(--text-secondary)]">{issue.email || issue.user?.email || 'No email'}</p>
                  </td>
                  <td className="p-4 text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">{issue.category || 'general'}</td>
                  <td className="max-w-lg p-4">
                    <p className="text-sm font-bold text-[var(--text-primary)]">{issue.subject || 'No subject'}</p>
                    <p className="mt-1 whitespace-pre-wrap text-xs leading-6 text-[var(--text-secondary)]">{issue.message}</p>
                  </td>
                  <td className="p-4">
                    <span
                      className={`rounded px-2 py-1 text-[10px] font-bold uppercase tracking-wider ${issue.status === 'resolved' ? 'bg-[var(--success-light)] text-[var(--success-dark)]' : issue.status === 'in_progress' ? 'bg-[var(--info-light)] text-[var(--info)]' : 'bg-[#FEF9C3] text-[var(--yellow-dark)]'}`}
                    >
                      {String(issue.status || 'open').replace('_', ' ')}
                    </span>
                  </td>
                  <td className="p-4 text-xs text-[var(--text-secondary)]">{new Date(issue.created_at).toLocaleString()}</td>
                  <td className="p-4">
                    <div className="flex flex-col gap-2">
                      {issue.status !== 'in_progress' && issue.status !== 'resolved' && (
                        <button
                          onClick={() => setIssueStatus(issue.id, 'in_progress')}
                          className="inline-flex items-center gap-1 rounded bg-[var(--info-light)] px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-[var(--info)]"
                        >
                          <Wrench className="h-3.5 w-3.5" /> In Progress
                        </button>
                      )}
                      {issue.status !== 'resolved' && (
                        <button
                          onClick={() => setIssueStatus(issue.id, 'resolved')}
                          className="inline-flex items-center gap-1 rounded bg-[var(--success-light)] px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-[var(--success-dark)]"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" /> Resolve
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
