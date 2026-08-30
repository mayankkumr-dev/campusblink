import React, { useCallback, useEffect, useState } from 'react';
import {
  Loader2,
  Pin,
  PinOff,
  RotateCcw,
  Trash2,
  Users,
  Calendar,
  AlertTriangle,
  Clock,
  ChevronDown
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import {
  deleteNoticeAndAttachments,
  hardRemoveNotice,
  restoreNotice,
  getNoticesForAdminPaginated,
  togglePinNotice,
} from '../../api/notices';
import toast from 'react-hot-toast';

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

function yearLabel(year: string) {
  if (year === 'all') return 'All Students';
  return year;
}

function isPinnedAndActive(notice: any): boolean {
  if (!notice.is_pinned) return false;
  if (!notice.pin_expires_at) return true;
  return new Date(notice.pin_expires_at) > new Date();
}

export const AdminPublishedNoticesLazyPage: React.FC = () => {
  const profile = useAuthStore((state) => state.profile);

  const [notices, setNotices] = useState<any[]>([]);
  const [isLoadingNotices, setIsLoadingNotices] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const LIMIT = 10;

  const loadNotices = useCallback(async (pageNum: number, isRefresh: boolean = false) => {
    setIsLoadingNotices(true);
    const { data, count, error } = await getNoticesForAdminPaginated(pageNum, LIMIT, profile?.college);
    if (error) {
      toast.error('Failed to load admin notices: ' + (error.message || 'Unknown error'));
      console.error('Admin notices load error:', error);
    }
    
    if (isRefresh) {
      setNotices(data || []);
    } else {
      setNotices((prev) => {
        // Filter out duplicates in case of race conditions
        const newItems = (data || []).filter(d => !prev.some(p => p.id === d.id));
        return [...prev, ...newItems];
      });
    }

    setHasMore((isRefresh ? (data?.length || 0) : notices.length + (data?.length || 0)) < count);
    setIsLoadingNotices(false);
  }, [profile?.college, notices.length]);

  useEffect(() => {
    loadNotices(1, true);
  }, [profile?.college]);

  const handleLoadMore = () => {
    if (isLoadingNotices || !hasMore) return;
    const nextPage = page + 1;
    setPage(nextPage);
    loadNotices(nextPage, false);
  };

  const handleSoftDelete = async (notice: any) => {
    if (notice.is_deleted) {
      setActionLoadingId(notice.id);
      const { error } = await restoreNotice(notice.id);
      setActionLoadingId(null);
      if (error) { toast.error('Failed to restore notice.'); return; }
      toast.success('Notice restored.');
      setNotices((prev) => prev.map((n) => n.id === notice.id ? { ...n, is_deleted: false } : n));
      return;
    }

    if (!window.confirm('Permanently delete this notice and all its attachments? This action cannot be undone.')) return;
    setActionLoadingId(notice.id);
    const { error } = await deleteNoticeAndAttachments(notice);
    setActionLoadingId(null);
    if (error) { toast.error('Failed to delete notice.'); return; }
    toast.success('Notice deleted. Students see the deletion placeholder.');
    setNotices((prev) => prev.map((n) => n.id === notice.id ? { ...n, is_deleted: true } : n));
  };

  const handleHardRemove = async (noticeId: string) => {
    if (!window.confirm('Permanently remove this notice? Students will see nothing at all.')) return;
    setActionLoadingId(noticeId);
    const { error } = await hardRemoveNotice(noticeId);
    setActionLoadingId(null);
    if (error) { toast.error('Failed to hard-remove notice.'); return; }
    toast.success('Notice fully removed.');
    setNotices((prev) => prev.filter((n) => n.id !== noticeId));
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-syne text-3xl sm:text-4xl font-bold text-text-primary mb-1">
            Published Notices
          </h1>
          <p className="text-text-secondary text-sm">
            View and manage all active notices (Lazy Loaded)
          </p>
        </div>
      </div>

      <div className="bg-surface border border-border-subtle rounded-3xl overflow-hidden shadow-sm">
        {notices.length > 0 ? (
          <div className="divide-y divide-border-subtle">
            {notices.map((notice) => {
              const pinned = isPinnedAndActive(notice);
              return (
                <div key={notice.id} className={`p-4 sm:p-5 hover:bg-surface-elevated transition-colors ${notice.is_deleted ? 'opacity-60' : ''}`}>
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        {pinned && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 text-[10px] font-bold uppercase tracking-wider border border-amber-200">
                            <Pin className="w-3 h-3" /> Pinned
                          </span>
                        )}
                        <h3 className="font-syne font-bold text-lg text-text-primary line-clamp-1">
                          {notice.title || 'Untitled Notice'}
                        </h3>
                      </div>
                      
                      {notice.content && (
                        <p className="text-sm text-text-secondary line-clamp-2">
                          {notice.content}
                        </p>
                      )}
                      
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-medium text-text-secondary/70">
                        <span className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5" />
                          {formatDate(notice.created_at)}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5" />
                          {yearLabel(notice.target_year)}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          {notice.is_deleted ? 'Soft Deleted' : 'Active'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleSoftDelete(notice)}
                        disabled={actionLoadingId === notice.id}
                        className={`p-2 rounded-xl border transition-all ${
                          notice.is_deleted 
                            ? 'bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100'
                            : 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100'
                        }`}
                        title={notice.is_deleted ? 'Restore' : 'Soft Delete'}
                      >
                        {actionLoadingId === notice.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : notice.is_deleted ? (
                          <RotateCcw className="w-4 h-4" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </button>
                      <button
                        onClick={() => handleHardRemove(notice.id)}
                        disabled={actionLoadingId === notice.id}
                        className="p-2 rounded-xl border bg-slate-900 text-white border-slate-900 hover:bg-slate-800 transition-all"
                        title="Hard Remove"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-12 text-center">
            {isLoadingNotices ? (
              <Loader2 className="w-8 h-8 animate-spin text-brand-primary mx-auto" />
            ) : (
              <p className="text-text-secondary font-medium">No published notices found.</p>
            )}
          </div>
        )}
      </div>
      
      {hasMore && (
        <div className="flex justify-center mt-6">
          <button 
            onClick={handleLoadMore}
            disabled={isLoadingNotices}
            className="flex items-center gap-2 px-6 py-2.5 bg-surface text-brand-primary font-bold rounded-xl border border-brand-primary/20 hover:bg-brand-primary/5 transition-colors disabled:opacity-50"
          >
            {isLoadingNotices ? <Loader2 className="w-4 h-4 animate-spin" /> : <ChevronDown className="w-4 h-4" />}
            {isLoadingNotices ? 'Loading...' : 'Load More'}
          </button>
        </div>
      )}
    </div>
  );
};
