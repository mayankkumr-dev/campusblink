import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { supabase } from '../../lib/supabase';
import { MessageSquare, Clock, Loader2, CheckCircle2, RefreshCw, Filter } from 'lucide-react';
import toast from 'react-hot-toast';

const STATUS_OPTIONS = ['new', 'in_progress', 'resolved', 'dismissed'] as const;
type FeedbackStatus = typeof STATUS_OPTIONS[number];

const STATUS_STYLES: Record<FeedbackStatus, string> = {
  new: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-400 transition-colors',
  in_progress: 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-400 transition-colors',
  resolved: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400 transition-colors',
  dismissed: 'border-slate-200 bg-slate-100 text-slate-500 dark:border-admin-border-subtle dark:bg-admin-bg-base dark:text-admin-text-secondary transition-colors',
};

export function AdminFeedbackPage() {
  const { profile } = useAuthStore();
  const [feedbacks, setFeedbacks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FeedbackStatus | 'all'>('all');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => { fetchFeedbacks(); }, []);

  const fetchFeedbacks = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('app_feedback')
        .select('*, profiles(username, name, email, role)')
        .order('created_at', { ascending: false });

      if (error) {
        // Fallback: try old table name
        const { data: fallback } = await supabase
          .from('feedback')
          .select('*, profiles(username, name, email, role)')
          .order('created_at', { ascending: false });
        setFeedbacks(fallback || []);
      } else {
        setFeedbacks(data || []);
      }
    } catch (err) {
      console.error('Error fetching feedback:', err);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id: string, status: string) => {
    setUpdatingId(id);
    try {
      const { error } = await supabase
        .from('app_feedback')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
      setFeedbacks(prev => prev.map(f => f.id === id ? { ...f, status } : f));
      toast.success(`Status updated to ${status.replace('_', ' ')}`);
    } catch {
      toast.error('Failed to update status');
    } finally {
      setUpdatingId(null);
    }
  };

  const filtered = filter === 'all' ? feedbacks : feedbacks.filter(f => f.status === filter);
  const countByStatus = STATUS_OPTIONS.reduce((acc, s) => ({
    ...acc,
    [s]: feedbacks.filter(f => f.status === s).length,
  }), {} as Record<string, number>);

  return (
    <div className="space-y-5 transition-colors pb-8">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-500/10 transition-colors">
            <MessageSquare className="h-4.5 w-4.5 text-blue-600 dark:text-blue-400 transition-colors" />
          </div>
          <div>
            <h2 className="font-syne text-xl font-extrabold text-slate-900 dark:text-admin-text-primary tracking-tight transition-colors">App Feedback</h2>
            <p className="text-xs text-slate-500 dark:text-admin-text-secondary transition-colors">User-submitted feedback and bug reports · {feedbacks.length} total</p>
          </div>
        </div>
        <button
          type="button"
          onClick={fetchFeedbacks}
          disabled={loading}
          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-admin-border-subtle bg-white dark:bg-admin-bg-surface px-4 py-2 text-xs font-bold text-slate-600 dark:text-admin-text-secondary hover:bg-slate-50 dark:hover:bg-admin-bg-surface-hover shadow-sm dark:shadow-none transition-colors disabled:opacity-50"
        >
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Status summary strip */}
      <div className="flex md:grid md:grid-cols-4 gap-2 md:gap-3 overflow-x-auto hide-scrollbar pb-1 -mx-4 px-4 md:mx-0 md:px-0">
        {STATUS_OPTIONS.map(s => (
          <button
            key={s}
            type="button"
            onClick={() => setFilter(filter === s ? 'all' : s)}
            className={`shrink-0 flex items-center gap-2 md:block rounded-full md:rounded-xl border px-4 py-2 md:p-3 text-left transition-all shadow-[0_2px_12px_rgba(0,0,0,0.02)] md:shadow-none ${
              filter === s ? STATUS_STYLES[s] + ' md:ring-2 md:ring-offset-1 md:ring-current dark:md:ring-offset-admin-bg-base' : 'border-slate-200 dark:border-admin-border-subtle bg-white dark:bg-admin-bg-surface hover:bg-slate-50 dark:hover:bg-admin-bg-surface-hover'
            }`}
          >
            <p className="text-[11px] md:text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-admin-text-secondary md:text-slate-400 dark:md:text-admin-text-tertiary capitalize md:mb-1 transition-colors">
              {s.replace('_', ' ')}
            </p>
            <p className="font-syne text-[14px] md:text-2xl font-extrabold text-slate-900 dark:text-admin-text-primary transition-colors">{countByStatus[s] || 0}</p>
          </button>
        ))}
      </div>

      {/* Filter pill */}
      {filter !== 'all' && (
        <div className="flex items-center gap-2 transition-colors">
          <Filter size={12} className="text-slate-400 dark:text-admin-text-tertiary" />
          <span className="text-xs text-slate-500 dark:text-admin-text-secondary">Showing: <strong className="text-slate-700 dark:text-admin-text-primary capitalize">{filter.replace('_', ' ')}</strong></span>
          <button
            type="button"
            onClick={() => setFilter('all')}
            className="text-xs text-amber-600 dark:text-amber-500 font-semibold hover:text-amber-700 dark:hover:text-amber-400 transition-colors"
          >
            Clear filter
          </button>
        </div>
      )}

      {/* Feedback list */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-7 w-7 animate-spin text-amber-500 dark:text-amber-400 transition-colors" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center px-6 rounded-3xl border border-slate-200 dark:border-admin-border-subtle bg-slate-50 dark:bg-admin-bg-surface-raised m-4 md:m-8 shadow-[0_2px_12px_rgba(0,0,0,0.02)] dark:shadow-none transition-colors">
          <div className="w-16 h-16 rounded-full bg-white dark:bg-admin-bg-surface shadow-sm dark:shadow-none flex items-center justify-center mb-4 transition-colors">
            <CheckCircle2 className="h-8 w-8 text-emerald-400 dark:text-emerald-500" />
          </div>
          <h3 className="text-[15px] font-bold text-slate-900 dark:text-admin-text-primary transition-colors">No feedback here</h3>
          <p className="text-xs text-slate-500 dark:text-admin-text-secondary mt-1 max-w-xs leading-relaxed transition-colors">
            {filter !== 'all' ? `No ${filter.replace('_', ' ')} feedback found.` : 'No feedback submitted yet.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(f => (
            <div
              key={f.id}
              className="rounded-2xl border border-slate-200 dark:border-admin-border-subtle bg-white dark:bg-admin-bg-surface p-5 shadow-sm dark:shadow-none hover:shadow-md dark:hover:border-admin-border-strong transition-all"
            >
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    <h3 className="font-semibold text-slate-900 dark:text-admin-text-primary capitalize transition-colors">
                      {f.category || f.type || 'General Feedback'}
                    </h3>
                    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${STATUS_STYLES[f.status as FeedbackStatus] || STATUS_STYLES.new}`}>
                      {(f.status || 'new').replace('_', ' ')}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-slate-400 dark:text-admin-text-tertiary mb-3 transition-colors">
                    <span className="font-medium text-slate-600 dark:text-admin-text-secondary">
                      {f.profiles?.name || f.profiles?.username || 'Anonymous'}
                    </span>
                    {f.profiles?.role && (
                      <span className="rounded-full border border-slate-200 dark:border-admin-border-subtle bg-slate-50 dark:bg-admin-bg-base px-2 py-0.5 text-[9px] font-bold uppercase text-slate-500 dark:text-admin-text-secondary transition-colors">
                        {f.profiles.role}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Clock size={10} />
                      {new Date(f.created_at).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-sm text-slate-700 dark:text-admin-text-secondary whitespace-pre-wrap leading-relaxed transition-colors">
                    {f.message || f.content || 'No message content'}
                  </p>
                </div>

                {/* Status changer */}
                <div className="shrink-0">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-admin-text-tertiary mb-1 transition-colors">Status</label>
                  <select
                    value={f.status || 'new'}
                    onChange={e => updateStatus(f.id, e.target.value)}
                    disabled={updatingId === f.id}
                    className="rounded-xl border border-slate-200 dark:border-admin-border-subtle bg-slate-50 dark:bg-admin-bg-surface-raised px-3 py-2 text-[12px] font-semibold text-slate-700 dark:text-admin-text-primary focus:border-amber-400 dark:focus:border-admin-accent focus:ring-2 focus:ring-amber-100 dark:focus:ring-admin-accent/20 outline-none transition-all disabled:opacity-60"
                  >
                    {STATUS_OPTIONS.map(s => (
                      <option key={s} value={s}>{s.replace('_', ' ').replace(/^\w/, c => c.toUpperCase())}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
