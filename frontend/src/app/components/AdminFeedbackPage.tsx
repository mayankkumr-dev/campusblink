import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { supabase } from '../../lib/supabase';
import { MessageSquare, Clock, Loader2, CheckCircle2, RefreshCw, Filter } from 'lucide-react';
import toast from 'react-hot-toast';

const STATUS_OPTIONS = ['new', 'in_progress', 'resolved', 'dismissed'] as const;
type FeedbackStatus = typeof STATUS_OPTIONS[number];

const STATUS_STYLES: Record<FeedbackStatus, string> = {
  new: 'border-amber-200 bg-amber-50 text-amber-700',
  in_progress: 'border-blue-200 bg-blue-50 text-blue-700',
  resolved: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  dismissed: 'border-slate-200 bg-slate-100 text-slate-500',
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
    <div className="space-y-5">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50">
            <MessageSquare className="h-4.5 w-4.5 text-blue-600" />
          </div>
          <div>
            <h2 className="font-syne text-xl font-extrabold text-slate-900 tracking-tight">App Feedback</h2>
            <p className="text-xs text-slate-500">User-submitted feedback and bug reports · {feedbacks.length} total</p>
          </div>
        </div>
        <button
          type="button"
          onClick={fetchFeedbacks}
          disabled={loading}
          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 shadow-sm transition-colors"
        >
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Status summary strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {STATUS_OPTIONS.map(s => (
          <button
            key={s}
            type="button"
            onClick={() => setFilter(filter === s ? 'all' : s)}
            className={`rounded-xl border p-3 text-left transition-all ${
              filter === s ? STATUS_STYLES[s] + ' ring-2 ring-offset-1 ring-current' : 'border-slate-200 bg-white hover:bg-slate-50'
            }`}
          >
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 capitalize mb-1">
              {s.replace('_', ' ')}
            </p>
            <p className="font-syne text-2xl font-extrabold text-slate-900">{countByStatus[s] || 0}</p>
          </button>
        ))}
      </div>

      {/* Filter pill */}
      {filter !== 'all' && (
        <div className="flex items-center gap-2">
          <Filter size={12} className="text-slate-400" />
          <span className="text-xs text-slate-500">Showing: <strong className="text-slate-700 capitalize">{filter.replace('_', ' ')}</strong></span>
          <button
            type="button"
            onClick={() => setFilter('all')}
            className="text-xs text-amber-600 font-semibold hover:text-amber-700"
          >
            Clear filter
          </button>
        </div>
      )}

      {/* Feedback list */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-7 w-7 animate-spin text-amber-500" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white py-16">
          <CheckCircle2 className="h-10 w-10 text-emerald-400 mb-3" />
          <h3 className="font-semibold text-slate-700">No feedback here</h3>
          <p className="text-sm text-slate-400 mt-1">
            {filter !== 'all' ? `No ${filter.replace('_', ' ')} feedback found.` : 'No feedback submitted yet.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(f => (
            <div
              key={f.id}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md transition-all"
            >
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    <h3 className="font-semibold text-slate-900 capitalize">
                      {f.category || f.type || 'General Feedback'}
                    </h3>
                    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${STATUS_STYLES[f.status as FeedbackStatus] || STATUS_STYLES.new}`}>
                      {(f.status || 'new').replace('_', ' ')}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-slate-400 mb-3">
                    <span className="font-medium text-slate-600">
                      {f.profiles?.name || f.profiles?.username || 'Anonymous'}
                    </span>
                    {f.profiles?.role && (
                      <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[9px] font-bold uppercase text-slate-500">
                        {f.profiles.role}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Clock size={10} />
                      {new Date(f.created_at).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                    {f.message || f.content || 'No message content'}
                  </p>
                </div>

                {/* Status changer */}
                <div className="shrink-0">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Status</label>
                  <select
                    value={f.status || 'new'}
                    onChange={e => updateStatus(f.id, e.target.value)}
                    disabled={updatingId === f.id}
                    className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-[12px] font-semibold text-slate-700 focus:border-amber-400 focus:ring-2 focus:ring-amber-100 outline-none transition-all disabled:opacity-60"
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
