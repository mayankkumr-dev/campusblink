import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Bell,
  FileText,
  Download,
  Pin,
  Loader2,
  RefreshCw,
  Megaphone,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Trash2,
  Search,
  ArrowLeft,
  X,
  ZoomIn,
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import {
  getNoticesForStudent,
  markNoticesAsSeen,
  softDeleteNotice,
} from '../../api/notices';
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

function formatRelativeTime(iso: string): string {
  const now = Date.now();
  const diff = now - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return formatDate(iso);
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

function getAttachmentCategory(type: string) {
  if (type?.startsWith('image/')) return 'image';
  if (type === 'application/pdf') return 'pdf';
  return 'doc';
}

function getNoticeCategory(title: string): 'urgent' | 'event' | 'general' {
  if (!title) return 'general';
  const t = title.toLowerCase();
  if (t.includes('urgent') || t.includes('important') || t.includes('deadline') || t.includes('alert') || t.includes('warning')) return 'urgent';
  if (t.includes('event') || t.includes('workshop') || t.includes('webinar') || t.includes('competition') || t.includes('fest') || t.includes('cultural')) return 'event';
  return 'general';
}

const CATEGORY_META = {
  urgent: {
    gradient: 'from-red-500/10 via-rose-500/5 to-transparent',
    bar: 'bg-gradient-to-b from-red-500 to-rose-600',
    badge: 'bg-red-500/10 text-red-600 border border-red-200',
    label: 'Urgent',
  },
  event: {
    gradient: 'from-emerald-500/10 via-green-500/5 to-transparent',
    bar: 'bg-gradient-to-b from-emerald-500 to-green-600',
    badge: 'bg-emerald-500/10 text-emerald-700 border border-emerald-200',
    label: 'Event',
  },
  general: {
    gradient: 'from-blue-500/10 via-indigo-500/5 to-transparent',
    bar: 'bg-gradient-to-b from-blue-500 to-indigo-600',
    badge: 'bg-blue-500/10 text-blue-700 border border-blue-200',
    label: 'Notice',
  },
} as const;

// ─── Image Lightbox ──────────────────────────────────────────────────────────

const ImageLightbox: React.FC<{ src: string; alt: string; onClose: () => void }> = ({ src, alt, onClose }) => {
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[999] flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors z-10"
      >
        <X className="w-5 h-5" />
      </button>
      <img
        src={src}
        alt={alt}
        className="max-w-full max-h-[90vh] rounded-2xl shadow-2xl object-contain"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
};

// ─── Attachment Preview Card ─────────────────────────────────────────────────

const AttachmentCard: React.FC<{ att: any }> = ({ att }) => {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const category = getAttachmentCategory(att.type || '');

  if (category === 'image') {
    return (
      <>
        {lightboxOpen && (
          <ImageLightbox src={att.url} alt={att.name} onClose={() => setLightboxOpen(false)} />
        )}
        <button
          type="button"
          onClick={() => setLightboxOpen(true)}
          className="group relative block w-28 h-20 rounded-xl overflow-hidden border border-gray-200 shadow-sm hover:shadow-md transition-all active:scale-95"
        >
          <img
            src={att.url}
            alt={att.name}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
          />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center">
            <ZoomIn className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-lg" />
          </div>
          <div className="absolute bottom-1 left-1 right-1">
            <span className="text-[9px] font-bold text-white bg-black/50 rounded px-1 py-0.5 truncate block text-center backdrop-blur-sm">
              {att.name?.split('.').pop()?.toUpperCase() || 'IMG'}
            </span>
          </div>
        </button>
      </>
    );
  }

  const isPdf = category === 'pdf';
  return (
    <a
      href={att.url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl border border-gray-200 bg-white hover:border-gray-300 hover:shadow-md transition-all group min-w-0 max-w-xs active:scale-[0.98]"
    >
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${isPdf ? 'bg-red-50 text-red-500' : 'bg-blue-50 text-blue-500'}`}>
        <FileText className="w-4 h-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-bold text-gray-800 truncate">{att.name || 'Document'}</p>
        <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider mt-0.5">
          {isPdf ? 'PDF' : 'Document'}
        </p>
      </div>
      <Download className="w-3.5 h-3.5 text-gray-400 group-hover:text-gray-700 transition-colors shrink-0" />
    </a>
  );
};

// ─── Deleted Notice Placeholder ──────────────────────────────────────────────

const DeletedNoticePlaceholder: React.FC = () => (
  <div className="bg-gray-50 border border-dashed border-gray-200 rounded-2xl p-4 flex items-center gap-3">
    <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
      <Trash2 className="w-4 h-4 text-gray-300" />
    </div>
    <p className="text-sm text-gray-400 font-medium italic">This message has been deleted.</p>
  </div>
);

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
  const isLong = (notice.content?.length || 0) > 200;

  const attachments: any[] = Array.isArray(notice.attachments) ? notice.attachments : [];
  const pinActive = isPinnedAndActive(notice);
  const category = getNoticeCategory(notice.title || '');
  const meta = CATEGORY_META[category];

  const handleSoftDelete = async () => {
    if (!window.confirm('Delete this notice? Students will see "This message has been deleted" in its place.')) return;
    setDeletingId(true);
    const profile = useAuthStore.getState().profile;
    const { error } = await softDeleteNotice(notice.id, profile?.id);
    setDeletingId(false);
    if (error) { toast.error('Failed to delete notice.'); return; }
    toast.success('Notice deleted.');
    onSoftDelete(notice.id);
  };

  return (
    <article
      className={[
        'relative bg-white dark:bg-[#171A21] rounded-2xl border overflow-hidden transition-all duration-300 group',
        pinActive
          ? 'border-amber-200 dark:border-amber-900/50 shadow-sm'
          : 'border-gray-100 dark:border-[#262A33] shadow-sm hover:border-gray-200 dark:hover:border-gray-700',
      ].join(' ')}
      style={{ animation: 'slideUpFade 0.4s ease both', animationDelay: `${index * 60}ms` }}
    >
      {/* Category gradient background */}
      <div className={`absolute inset-0 bg-gradient-to-br ${meta.gradient} pointer-events-none opacity-40 dark:opacity-20`} />

      {/* Left color bar */}
      <div className={`absolute top-0 left-0 bottom-0 w-1 ${meta.bar} rounded-l-2xl`} />

      {/* Unread pulse dot */}
      {isUnread && (
        <div className="absolute top-4 right-4 w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.6)] animate-pulse" />
      )}

      <div className="relative p-5 pl-6">
        {/* Pinned badge */}
        {pinActive && (
          <div className="flex items-center gap-1.5 mb-3">
            <Pin className="w-3 h-3 text-amber-500 fill-amber-500" />
            <span className="text-[10px] font-extrabold text-amber-600 dark:text-amber-400 uppercase tracking-[0.1em]">Pinned</span>
            {notice.pin_expires_at && (
              <span className="ml-auto text-[10px] text-amber-500 dark:text-amber-400 font-medium">
                Expires {new Date(notice.pin_expires_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
              </span>
            )}
          </div>
        )}

        {/* Meta row */}
        <div className="flex items-center gap-2 mb-2.5 flex-wrap">
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${meta.badge}`}>
            {meta.label}
          </span>
          <span className="text-[10px] font-semibold text-gray-400 dark:text-[#9AA0AC] uppercase tracking-wider">
            {yearLabel(notice.target_year)}
          </span>
          <span className="text-gray-200 dark:text-gray-700">•</span>
          <span className="text-[10px] font-medium text-gray-400 dark:text-[#9AA0AC]">
            {formatRelativeTime(notice.created_at)}
          </span>
        </div>

        {/* Title row with delete */}
        <div className="flex items-start justify-between gap-4 mb-2">
          <h2
            className="text-[15px] font-extrabold text-gray-900 dark:text-[#F4F5F7] leading-snug flex-1"
          >
            {notice.title}
          </h2>
          {isAdmin && (
            <button
              type="button"
              title="Delete notice"
              onClick={handleSoftDelete}
              disabled={deletingId}
              className="w-8 h-8 rounded-full hover:bg-rose-50 dark:hover:bg-rose-900/30 text-gray-300 dark:text-gray-600 hover:text-rose-500 flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 sm:opacity-100 shrink-0 -mt-1"
            >
              {deletingId ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
            </button>
          )}
        </div>

        {/* Content */}
        {notice.content && (
          <p className={`text-sm text-gray-500 dark:text-[#9AA0AC] leading-relaxed whitespace-pre-wrap font-medium ${!expanded && isLong ? 'line-clamp-3' : ''}`}>
            {notice.content}
          </p>
        )}
        {isLong && (
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); setExpanded(!expanded); }}
            className="mt-1.5 inline-flex items-center gap-1 text-xs font-bold text-blue-600 dark:text-blue-400 hover:text-blue-800 transition-colors"
          >
            {expanded
              ? <><ChevronUp className="w-3.5 h-3.5" /> Show less</>
              : <><ChevronDown className="w-3.5 h-3.5" /> Read more</>
            }
          </button>
        )}

        {/* Attachments */}
        {attachments.length > 0 && (
          <div className="mt-3.5 flex flex-wrap gap-2.5 relative z-10">
            {attachments.map((att, idx) => (
              <AttachmentCard key={idx} att={att} />
            ))}
          </div>
        )}

        {/* Footer date */}
        <div className="mt-3 pt-3 border-t border-gray-100 dark:border-[#262A33] flex items-center justify-between">
          <span className="text-[10px] font-medium text-gray-400 dark:text-[#9AA0AC]">{formatDate(notice.created_at)}</span>
          {attachments.length > 0 && (
            <span className="text-[10px] font-semibold text-gray-400 dark:text-[#9AA0AC]">
              {attachments.length} attachment{attachments.length > 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>
    </article>
  );
};

// ─── Skeleton Loader ─────────────────────────────────────────────────────────

const NoticeSkeleton: React.FC<{ delay?: number }> = ({ delay = 0 }) => (
  <div
    className="bg-white rounded-2xl border border-gray-100 p-5 pl-6 relative overflow-hidden"
    style={{ animation: 'slideUpFade 0.4s ease both', animationDelay: `${delay}ms` }}
  >
    <div className="absolute top-0 left-0 bottom-0 w-1 bg-gray-100 rounded-l-2xl" />
    <div className="flex gap-2 mb-3">
      <div className="h-4 bg-gray-100 rounded-full w-14 animate-pulse" />
      <div className="h-4 bg-gray-100 rounded-full w-20 animate-pulse" />
    </div>
    <div className="h-5 bg-gray-100 rounded-lg w-3/4 mb-3 animate-pulse" />
    <div className="space-y-2">
      <div className="h-3.5 bg-gray-100 rounded w-full animate-pulse" />
      <div className="h-3.5 bg-gray-100 rounded w-5/6 animate-pulse" />
      <div className="h-3.5 bg-gray-100 rounded w-2/3 animate-pulse" />
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
  const searchInputRef = useRef<HTMLInputElement>(null);

  const isAdmin = Boolean(profile?.is_notice_admin) || profile?.role === 'admin';

  const load = useCallback(async (refresh = false) => {
    if (refresh) setIsRefreshing(true);
    else setIsLoading(true);
    const { data } = await getNoticesForStudent({
      college: profile?.college,
      studyYear: profile?.study_year || profile?.academic_year,
    });
    setNotices(data);
    if (refresh) setIsRefreshing(false);
    else setIsLoading(false);
  }, [profile?.college, profile?.study_year, profile?.academic_year]);

  useEffect(() => {
    setInitialLastSeen(localStorage.getItem('campus_blink_notices_last_seen'));
    markNoticesAsSeen();
    window.dispatchEvent(new CustomEvent('notices-seen'));
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (isSearchActive) searchInputRef.current?.focus();
  }, [isSearchActive]);

  const handleSoftDelete = (deletedId: string) => {
    setNotices((prev) => prev.map((n) => n.id === deletedId ? { ...n, is_deleted: true } : n));
  };

  const filterBySearch = (list: any[]) => {
    if (!searchQuery) return list;
    const lowerQ = searchQuery.toLowerCase();
    return list.filter(n => n.title?.toLowerCase().includes(lowerQ) || n.content?.toLowerCase().includes(lowerQ));
  };

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
    <>
      <style>{`
        @keyframes slideUpFade {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0);    }
        }
      `}</style>

      <div className="min-h-full bg-gray-50 dark:bg-[#101113] pb-16">
        {/* Slim action bar — icons only (layout already renders "Notices" title) */}
        <div className="sticky top-0 z-30 bg-white/80 dark:bg-[#171A21]/80 backdrop-blur-xl border-b border-gray-100 dark:border-[#262A33]">
          <div className="max-w-2xl mx-auto px-4 py-2.5 flex items-center gap-2">
            {isSearchActive ? (
              <div className="flex items-center gap-2 w-full animate-in fade-in slide-in-from-right-4 duration-200">
                <button
                  onClick={() => { setIsSearchActive(false); setSearchQuery(''); }}
                  className="w-9 h-9 shrink-0 rounded-full flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    placeholder="Search notices…"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-gray-100 dark:bg-[#202226] pl-9 pr-4 py-2 rounded-full text-sm font-medium text-gray-900 dark:text-[#F4F5F7] focus:outline-none focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-800 placeholder:text-gray-400 dark:placeholder:text-gray-500 transition-all"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 flex items-center justify-center text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-end w-full gap-1">
                <button
                  onClick={() => setIsSearchActive(true)}
                  className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 transition-colors"
                >
                  <Search className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => load(true)}
                  disabled={isRefreshing}
                  className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 transition-colors disabled:opacity-40"
                >
                  <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="max-w-2xl mx-auto px-4 pt-4 md:px-6">
          {/* Notice Admin Quick Link */}
          {isAdmin && (
            <Link
              to="/student/notices/admin"
              className="mb-5 flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-orange-50 to-amber-50 dark:from-amber-950/40 dark:to-orange-950/40 rounded-2xl border border-orange-100 dark:border-amber-900/50 active:scale-[0.99] transition-all group hover:shadow-md"
              style={{ animation: 'slideUpFade 0.3s ease both' }}
            >
              <div className="w-9 h-9 rounded-xl bg-orange-100 dark:bg-amber-900/60 flex items-center justify-center text-orange-600 dark:text-amber-400 shrink-0 group-hover:scale-105 transition-transform">
                <Megaphone className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-orange-900 dark:text-amber-300">Notice Admin Panel</p>
                <p className="text-[11px] text-orange-600/70 dark:text-amber-400/80 font-medium">Publish &amp; manage notices</p>
              </div>
              <ExternalLink className="w-4 h-4 text-orange-400 dark:text-amber-400 shrink-0 group-hover:text-orange-500 dark:group-hover:text-amber-300 transition-colors" />
            </Link>
          )}

          {/* Loading skeletons */}
          {isLoading && (
            <div className="space-y-3">
              {[0, 80, 160].map((d) => <NoticeSkeleton key={d} delay={d} />)}
            </div>
          )}

          {/* Empty state */}
          {!isLoading && notices.length === 0 && (
            <div
              className="flex flex-col items-center justify-center py-28 text-center"
              style={{ animation: 'slideUpFade 0.4s ease both' }}
            >
              <div className="w-16 h-16 rounded-2xl bg-white border border-gray-100 shadow-[0_4px_20px_rgba(0,0,0,0.06)] flex items-center justify-center text-gray-300 mb-4">
                <Bell className="w-7 h-7 stroke-[1.5]" />
              </div>
              <p className="text-lg font-extrabold text-gray-800" style={{ fontFamily: 'SF Pro Display, system-ui, sans-serif' }}>No notices yet</p>
              <p className="text-sm text-gray-400 font-medium mt-1 max-w-xs">
                Official notices from your college administration will appear here.
              </p>
            </div>
          )}

          {/* Empty search results */}
          {!isLoading && notices.length > 0 && filteredActive.length === 0 && filteredDeleted.length === 0 && (
            <div
              className="flex flex-col items-center justify-center py-20 text-center"
              style={{ animation: 'slideUpFade 0.4s ease both' }}
            >
              <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 mb-3">
                <Search className="w-5 h-5" />
              </div>
              <p className="text-sm text-gray-500 font-semibold">No results for &quot;{searchQuery}&quot;</p>
            </div>
          )}

          {/* Pinned notices */}
          {!isLoading && pinned.length > 0 && (
            <div className="space-y-3 mb-4">
              {pinned.map((notice) => {
                const isUnread = checkIsUnread(notice.created_at);
                const comp = (
                  <NoticeCard
                    key={notice.id}
                    index={globalIndex}
                    notice={notice}
                    isAdmin={isAdmin}
                    onSoftDelete={handleSoftDelete}
                    isUnread={isUnread}
                  />
                );
                globalIndex++;
                return comp;
              })}
            </div>
          )}

          {/* Divider between pinned and regular */}
          {!isLoading && pinned.length > 0 && (regular.length > 0 || filteredDeleted.length > 0) && (
            <div
              className="flex items-center gap-3 my-5"
              style={{ animation: 'slideUpFade 0.4s ease both', animationDelay: `${globalIndex * 60}ms` }}
            >
              <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent" />
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.12em]">Recent</span>
              <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent" />
            </div>
          )}

          {/* Regular + deleted notices */}
          {!isLoading && (regular.length > 0 || filteredDeleted.length > 0) && (
            <div className="space-y-3">
              {[...regular, ...filteredDeleted]
                .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                .map((notice) => {
                  const isUnread = checkIsUnread(notice.created_at);
                  const comp = notice.is_deleted ? (
                    <div
                      key={notice.id}
                      style={{ animation: 'slideUpFade 0.4s ease both', animationDelay: `${globalIndex * 60}ms` }}
                    >
                      <DeletedNoticePlaceholder />
                    </div>
                  ) : (
                    <NoticeCard
                      key={notice.id}
                      index={globalIndex}
                      notice={notice}
                      isAdmin={isAdmin}
                      onSoftDelete={handleSoftDelete}
                      isUnread={isUnread}
                    />
                  );
                  globalIndex++;
                  return comp;
                })
              }
            </div>
          )}
        </div>
      </div>
    </>
  );
};
