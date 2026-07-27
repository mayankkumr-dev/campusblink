import React, { useCallback, useEffect, useState } from 'react';
import {
  Bell,
  FileText,
  ImageIcon,
  Download,
  Pin,
  Loader2,
  RefreshCw,
  Megaphone,
  Calendar,
  Users,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Trash2,
  Search,
  ArrowLeft,
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import {
  getNoticesForStudent,
  markNoticesAsSeen,
  softDeleteNotice,
} from '../../api/notices';
import { getAvatarDataUrl } from '../../lib/avatar';
import { Link } from 'react-router';
import toast from 'react-hot-toast';

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function yearLabel(year: string) {
  if (year === 'all') return 'All Students';
  return year; // "1st Year", "2nd Year" etc — stored verbatim
}

function isPinnedAndActive(notice: any): boolean {
  if (!notice.is_pinned) return false;
  if (!notice.pin_expires_at) return true;
  return new Date(notice.pin_expires_at) > new Date();
}

function getAttachmentCategory(type: string) {
  if (type?.startsWith('image/')) return 'image';
  if (type === 'application/pdf') return 'pdf';
  return 'doc';
}

// ─── Attachment Preview Card ─────────────────────────────────────────────────

const AttachmentCard: React.FC<{ att: any }> = ({ att }) => {
  const category = getAttachmentCategory(att.type || '');

  if (category === 'image') {
    return (
      <a
        href={att.url}
        target="_blank"
        rel="noopener noreferrer"
        className="group relative block w-32 h-24 rounded-2xl overflow-hidden border border-border-subtle shadow-[0_2px_12px_rgba(0,0,0,0.06)] hover:shadow-[0_6px_20px_rgba(0,0,0,0.10)] transition-all"
      >
        <img
          src={att.url}
          alt={att.name}
          className="h-full w-full object-cover transition-transform group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all flex items-center justify-center">
          <ExternalLink className="w-4 h-4 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </a>
    );
  }

  const isPdf = category === 'pdf';
  return (
    <a
      href={att.url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-3 px-4 py-3 rounded-2xl border border-border-subtle bg-surface shadow-[0_2px_12px_rgba(0,0,0,0.04)] hover:shadow-[0_6px_20px_rgba(0,0,0,0.08)] hover:border-slate-300 transition-all group min-w-0 max-w-[260px]"
    >
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${isPdf ? 'bg-accent-red/15 text-accent-red' : 'bg-accent-blue-soft text-accent-blue'}`}>
        <FileText className="w-5 h-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-bold text-text-primary truncate">{att.name}</p>
        <p className="text-[10px] text-text-secondary font-medium uppercase tracking-wider mt-0.5">
          {isPdf ? 'PDF Document' : 'Document'}
        </p>
      </div>
      <Download className="w-3.5 h-3.5 text-text-secondary/70 group-hover:text-amber-600 transition-colors shrink-0" />
    </a>
  );
};

// ─── Deleted Notice Placeholder ──────────────────────────────────────────────

const DeletedNoticePlaceholder: React.FC = () => (
  <article className="bg-white rounded-2xl shadow-sm p-5">
    <div className="flex items-center gap-3">
      <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
        <Trash2 className="w-4 h-4 text-gray-400" />
      </div>
      <p className="text-sm text-gray-500 font-medium italic">
        This message has been deleted.
      </p>
    </div>
  </article>
);

// ─── Notice Categories & Colors ──────────────────────────────────────────────

function getNoticeCategory(title: string) {
  if (!title) return 'general';
  const lowerTitle = title.toLowerCase();
  if (lowerTitle.includes('urgent') || lowerTitle.includes('important') || lowerTitle.includes('deadline') || lowerTitle.includes('alert')) {
    return 'urgent';
  }
  if (lowerTitle.includes('event') || lowerTitle.includes('workshop') || lowerTitle.includes('webinar') || lowerTitle.includes('competition')) {
    return 'event';
  }
  return 'general';
}

function getCategoryColorClass(category: string) {
  switch (category) {
    case 'urgent': return 'bg-red-500';
    case 'event': return 'bg-green-500';
    default: return 'bg-blue-500';
  }
}

// ─── Single Notice Card ──────────────────────────────────────────────────────

const NoticeCard: React.FC<{
  notice: any;
  isAdmin: boolean;
  onSoftDelete: (id: string) => void;
  index: number;
  isUnread?: boolean;
}> = ({ notice, isAdmin, onSoftDelete, index, isUnread }) => {
  const [expanded, setExpanded] = useState(false);
  const [deletingId, setDeletingId] = useState(false);
  const isLong = notice.content?.length > 200;

  const attachments: any[] = Array.isArray(notice.attachments) ? notice.attachments : [];
  const pinActive = isPinnedAndActive(notice);
  const category = getNoticeCategory(notice.title || '');
  const stripColor = getCategoryColorClass(category);

  const handleSoftDelete = async () => {
    if (!window.confirm('Delete this notice? Students will see "This message has been deleted" in its place.')) return;
    setDeletingId(true);
    const profile = useAuthStore.getState().profile;
    const { error } = await softDeleteNotice(notice.id, profile?.id);
    setDeletingId(false);
    if (error) {
      toast.error('Failed to delete notice.');
      return;
    }
    toast.success('Notice deleted.');
    onSoftDelete(notice.id);
  };

  return (
    <article 
      className={`bg-white dark:bg-surface border border-gray-100 dark:border-border-subtle rounded-2xl shadow-sm hover:shadow-md transition-all duration-200 active:scale-[0.98] active:bg-gray-50 dark:active:bg-surface-elevated relative overflow-hidden group animate-in fade-in slide-in-from-bottom-4 ${
        pinActive ? 'ring-1 ring-amber-100 dark:ring-amber-500/20' : ''
      }`}
      style={{ animationFillMode: 'both', animationDelay: `${index * 75}ms` }}
    >
      {/* Absolute Vertical Color Strip */}
      <div className={`absolute left-0 top-0 bottom-0 w-1 ${stripColor}`} />

      {/* Unread Indicator */}
      {isUnread && (
        <div className="absolute top-4 right-4 w-2 h-2 bg-blue-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
      )}

      {/* Pinned Banner */}
      {pinActive && (
        <div className="flex items-center gap-2 px-5 pt-4 pb-0 pl-6">
          <Pin className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
          <span className="text-[11px] font-bold text-amber-500 uppercase tracking-widest">
            Pinned Notice
          </span>
          {notice.pin_expires_at && (
            <span className="ml-auto text-[10px] text-amber-500 font-medium">
              Expires {new Date(notice.pin_expires_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
            </span>
          )}
        </div>
      )}

      <div className="p-5 md:p-6 relative pl-6 md:pl-7">
        {/* Metadata */}
        <div className="flex items-center gap-2 mb-3">
          <span className="text-[10px] font-bold text-gray-400 dark:text-text-secondary uppercase tracking-wider">
            {yearLabel(notice.target_year)}
          </span>
          <span className="text-gray-300 dark:text-border-subtle">•</span>
          <span className="text-[10px] font-bold text-gray-400 dark:text-text-secondary uppercase tracking-wider">
            {formatDate(notice.created_at)}
          </span>
        </div>

        {/* Title & Delete Button */}
        <div className="flex items-start justify-between gap-4 mb-2 pr-8">
          <h2 className="text-lg font-extrabold text-gray-900 dark:text-text-primary leading-tight transition-colors">
            {notice.title}
          </h2>
        </div>

        {isAdmin && (
          <button
            type="button"
            title="Delete notice"
            onClick={handleSoftDelete}
            disabled={deletingId}
            className="w-8 h-8 rounded-full hover:bg-gray-100 text-gray-400 hover:text-rose-600 flex items-center justify-center transition-colors absolute top-5 right-5 opacity-0 group-hover:opacity-100 sm:opacity-100 z-10"
          >
            {deletingId ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
          </button>
        )}

        {/* Content */}
        <p className={`text-sm text-gray-600 leading-relaxed whitespace-pre-wrap ${!expanded && isLong ? 'line-clamp-2' : ''}`}>
          {notice.content}
        </p>
        {isLong && (
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); setExpanded(!expanded); }}
            className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors"
          >
            {expanded
              ? <><ChevronUp className="w-3.5 h-3.5" /> Show less</>
              : <><ChevronDown className="w-3.5 h-3.5" /> Read more</>
            }
          </button>
        )}

        {/* Attachments */}
        {attachments.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-3 relative z-10">
            {attachments.map((att, idx) => (
              <AttachmentCard key={idx} att={att} />
            ))}
          </div>
        )}
      </div>
    </article>
  );
};

// ─── Skeleton Loader ─────────────────────────────────────────────────────────

const NoticeSkeleton = () => (
  <div className="bg-white rounded-2xl shadow-sm p-6 animate-pulse">
    <div className="flex items-center gap-2 mb-3">
      <div className="h-3 bg-gray-200 rounded w-16" />
      <div className="h-3 bg-gray-200 rounded w-20" />
    </div>
    <div className="h-5 bg-gray-200 rounded-lg w-3/4 mb-4" />
    <div className="space-y-2">
      <div className="h-3 bg-gray-200 rounded w-full" />
      <div className="h-3 bg-gray-200 rounded w-5/6" />
    </div>
  </div>
);

// ─── Main Notices Page ────────────────────────────────────────────────────────

export const NoticesPage: React.FC = () => {
  const profile = useAuthStore((state) => state.profile);
  const [notices, setNotices] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [initialLastSeen, setInitialLastSeen] = useState<string | null>(null);

  const isAdmin = Boolean(profile?.is_notice_admin) || profile?.role === 'admin';

  const load = useCallback(async (refresh = false) => {
    if (refresh) setIsRefreshing(true);
    else setIsLoading(true);

    const { data } = await getNoticesForStudent({
      college: profile?.college,
      studyYear: profile?.study_year,
    });
    setNotices(data);

    if (refresh) setIsRefreshing(false);
    else setIsLoading(false);
  }, [profile?.college, profile?.study_year]);

  useEffect(() => {
    // Capture the initial last seen time to show unread dots before it's updated
    setInitialLastSeen(localStorage.getItem('campus_blink_notices_last_seen'));
    markNoticesAsSeen();
    // Dispatch a custom event so the sidebar can reset its count
    window.dispatchEvent(new CustomEvent('notices-seen'));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleSoftDelete = (deletedId: string) => {
    setNotices((prev) =>
      prev.map((n) => n.id === deletedId ? { ...n, is_deleted: true } : n)
    );
  };

  const filterBySearch = (list: any[]) => {
    if (!searchQuery) return list;
    const lowerQ = searchQuery.toLowerCase();
    return list.filter(n => n.title?.toLowerCase().includes(lowerQ) || n.content?.toLowerCase().includes(lowerQ));
  };

  // Split: is_deleted notices always show as placeholder, pinned first otherwise
  const activeNotices = notices.filter((n) => !n.is_deleted);
  const deletedNotices = notices.filter((n) => n.is_deleted);

  const filteredActive = filterBySearch(activeNotices);
  const filteredDeleted = filterBySearch(deletedNotices);

  const pinned = filteredActive.filter(isPinnedAndActive);
  const regular = filteredActive.filter((n) => !isPinnedAndActive(n));

  const checkIsUnread = (createdAt: string) => {
    if (!initialLastSeen) return true;
    return new Date(createdAt) > new Date(initialLastSeen);
  };

  let globalIndex = 0;

  return (
    <div className="min-h-full bg-gray-50 dark:bg-background pb-12 relative transition-colors">
      {/* Unified Sticky App Bar */}
      <div className="sticky top-0 z-30 bg-white/80 dark:bg-surface/80 backdrop-blur-xl border-b border-gray-100 dark:border-border-subtle shadow-sm transition-all">
        <div className="max-w-2xl mx-auto px-4 py-3 md:px-6 flex items-center justify-between">
          {!isSearchActive ? (
            <>
              <h1 className="text-xl font-extrabold text-gray-900 dark:text-text-primary tracking-tight transition-colors">Notices</h1>
              <div className="flex items-center gap-1">
                <button 
                  onClick={() => setIsSearchActive(true)}
                  className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-gray-100 dark:hover:bg-surface-elevated text-gray-600 dark:text-text-secondary transition-colors"
                >
                  <Search className="w-5 h-5" />
                </button>
                <button
                  type="button"
                  onClick={() => load(true)}
                  disabled={isRefreshing}
                  className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-gray-100 dark:hover:bg-surface-elevated text-gray-600 dark:text-text-secondary transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </>
          ) : (
            <div className="flex items-center gap-2 w-full animate-in fade-in slide-in-from-right-4 duration-200">
              <button 
                onClick={() => { setIsSearchActive(false); setSearchQuery(''); }}
                className="w-10 h-10 shrink-0 rounded-full flex items-center justify-center hover:bg-gray-100 dark:hover:bg-surface-elevated text-gray-600 dark:text-text-secondary transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <input
                autoFocus
                type="text"
                placeholder="Search notices..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 bg-gray-100/50 dark:bg-surface-elevated border-none text-gray-900 dark:text-text-primary px-4 py-2 rounded-full text-sm font-medium focus:outline-none focus:ring-2 focus:ring-gray-200 dark:focus:ring-border-subtle transition-all placeholder:text-gray-400 dark:placeholder:text-text-secondary"
              />
            </div>
          )}
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 md:px-6 pt-6">
        {/* Notice Admin Quick Link - Refined Banner */}
        {isAdmin && (
          <Link
            to="/student/notices/admin"
            className="mb-6 flex items-center gap-3 px-4 py-3 bg-orange-50/50 dark:bg-orange-950/20 rounded-2xl border border-orange-100/50 dark:border-orange-900/30 hover:bg-orange-50 dark:hover:bg-orange-950/30 transition-colors group animate-in fade-in slide-in-from-bottom-4"
          >
            <div className="w-8 h-8 rounded-full bg-orange-100/80 dark:bg-orange-900/40 flex items-center justify-center text-orange-600 dark:text-orange-400 shrink-0 group-hover:scale-105 transition-transform">
              <Megaphone className="w-4 h-4" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-orange-900 dark:text-orange-300">Notice Admin Panel</p>
            </div>
            <ExternalLink className="w-4 h-4 text-orange-400 shrink-0 group-hover:text-orange-500 transition-colors" />
          </Link>
        )}

        {/* Loading */}
        {isLoading && (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => <NoticeSkeleton key={i} />)}
          </div>
        )}

        {/* Empty */}
        {!isLoading && notices.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-16 h-16 rounded-2xl bg-white border border-gray-100 shadow-sm flex items-center justify-center text-gray-400 mb-4">
              <Bell className="w-7 h-7 stroke-[1.5]" />
            </div>
            <p className="font-syne text-lg font-bold text-gray-900">No notices yet</p>
            <p className="text-sm text-gray-500 font-medium mt-1 max-w-xs">
              Official notices from your college administration will appear here.
            </p>
          </div>
        )}

        {/* Empty Search Results */}
        {!isLoading && notices.length > 0 && filteredActive.length === 0 && filteredDeleted.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 mb-4">
              <Search className="w-5 h-5" />
            </div>
            <p className="text-sm text-gray-500 font-medium max-w-xs">
              No notices match your search "{searchQuery}".
            </p>
          </div>
        )}

        {/* Pinned */}
        {!isLoading && pinned.length > 0 && (
          <div className="space-y-4 mb-4">
            {pinned.map((notice) => {
              const isUnread = checkIsUnread(notice.created_at);
              const comp = <NoticeCard key={notice.id} index={globalIndex} notice={notice} isAdmin={isAdmin} onSoftDelete={handleSoftDelete} isUnread={isUnread} />;
              globalIndex++;
              return comp;
            })}
          </div>
        )}

        {/* Divider */}
        {!isLoading && pinned.length > 0 && (regular.length > 0 || filteredDeleted.length > 0) && (
          <div className="flex items-center gap-3 my-6 animate-in fade-in" style={{ animationDelay: `${globalIndex * 75}ms` }}>
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Recent</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>
        )}

        {/* Regular + deleted (interleaved by created_at order) */}
        {!isLoading && (regular.length > 0 || filteredDeleted.length > 0) && (
          <div className="space-y-4">
            {[...regular, ...filteredDeleted]
              .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
              .map((notice) => {
                const isUnread = checkIsUnread(notice.created_at);
                const comp = notice.is_deleted ? (
                  <div key={notice.id} className="animate-in fade-in slide-in-from-bottom-4" style={{ animationFillMode: 'both', animationDelay: `${globalIndex * 75}ms` }}>
                    <DeletedNoticePlaceholder />
                  </div>
                ) : (
                  <NoticeCard key={notice.id} index={globalIndex} notice={notice} isAdmin={isAdmin} onSoftDelete={handleSoftDelete} isUnread={isUnread} />
                );
                globalIndex++;
                return comp;
              })
            }
          </div>
        )}
      </div>
    </div>
  );
};
