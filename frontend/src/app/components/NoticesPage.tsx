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
  <article className="bg-surface rounded-3xl border border-border-subtle p-5">
    <div className="flex items-center gap-3">
      <div className="w-8 h-8 rounded-full bg-border-subtle flex items-center justify-center shrink-0">
        <Trash2 className="w-4 h-4 text-text-secondary/70" />
      </div>
      <p className="text-sm text-text-secondary font-medium italic">
        This message has been deleted.
      </p>
    </div>
  </article>
);

// ─── Single Notice Card ──────────────────────────────────────────────────────

const NoticeCard: React.FC<{
  notice: any;
  isAdmin: boolean;
  onSoftDelete: (id: string) => void;
}> = ({ notice, isAdmin, onSoftDelete }) => {
  const [expanded, setExpanded] = useState(false);
  const [deletingId, setDeletingId] = useState(false);
  const isLong = notice.content.length > 280;
  const displayContent = isLong && !expanded
    ? notice.content.slice(0, 280) + '…'
    : notice.content;

  const attachments: any[] = Array.isArray(notice.attachments) ? notice.attachments : [];
  const pinActive = isPinnedAndActive(notice);

  const handleSoftDelete = async () => {
    if (!window.confirm('Delete this notice? Students will see "This message has been deleted" in its place.')) return;
    setDeletingId(true);
    // Note: We don't have profile here directly, we need to get it from useAuthStore
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
    <article className={`bg-surface rounded-3xl border shadow-[0_2px_16px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_32px_rgba(0,0,0,0.07)] transition-all ${
      pinActive ? 'border-accent-amber-soft ring-1 ring-amber-100' : 'border-border-subtle'
    }`}>
      {/* Pinned Banner */}
      {pinActive && (
        <div className="flex items-center gap-2 px-5 pt-4 pb-0">
          <Pin className="w-3.5 h-3.5 text-accent-amber fill-amber-600" />
          <span className="text-[11px] font-bold text-accent-amber uppercase tracking-widest">
            Pinned Notice
          </span>
          {notice.pin_expires_at && (
            <span className="ml-auto text-[10px] text-accent-amber font-medium">
              Expires {new Date(notice.pin_expires_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
            </span>
          )}
        </div>
      )}

      <div className="p-5 md:p-6">
        {/* Header Row */}
        <div className="flex items-start justify-between gap-4 mb-3">
          <h2 className="font-syne text-base sm:text-lg font-extrabold text-text-primary leading-snug flex-1">
            {notice.title}
          </h2>
          <div className="flex items-center gap-2 shrink-0">
            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
              notice.target_year === 'all'
                ? 'bg-surface-elevated text-text-secondary'
                : 'bg-accent-amber-soft text-accent-amber border border-amber-100'
            }`}>
              <Users className="w-3 h-3" />
              {yearLabel(notice.target_year)}
            </span>
            {/* Notice admin soft-delete button */}
            {isAdmin && (
              <button
                type="button"
                title="Delete notice"
                onClick={handleSoftDelete}
                disabled={deletingId}
                className="w-7 h-7 rounded-lg bg-surface-elevated hover:bg-rose-50 text-text-secondary/70 hover:text-rose-600 flex items-center justify-center transition-colors"
              >
                {deletingId ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        <p className="text-sm text-text-primary font-medium leading-relaxed whitespace-pre-wrap">
          {displayContent}
        </p>
        {isLong && (
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-accent-amber hover:text-amber-900 transition-colors"
          >
            {expanded
              ? <><ChevronUp className="w-3.5 h-3.5" /> Show less</>
              : <><ChevronDown className="w-3.5 h-3.5" /> Read more</>
            }
          </button>
        )}

        {/* Attachments */}
        {attachments.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-3">
            {attachments.map((att, idx) => (
              <AttachmentCard key={idx} att={att} />
            ))}
          </div>
        )}

        {/* Footer: Date only — no author shown */}
        <div className="mt-4 pt-4 border-t border-border-subtle flex items-center justify-end">
          <div className="flex items-center gap-1.5 text-[11px] text-text-secondary/70 font-medium">
            <Calendar className="w-3.5 h-3.5" />
            {formatDate(notice.created_at)}
          </div>
        </div>
      </div>
    </article>
  );
};

// ─── Skeleton Loader ─────────────────────────────────────────────────────────

const NoticeSkeleton = () => (
  <div className="bg-surface rounded-3xl border border-border-subtle p-6 animate-pulse">
    <div className="flex justify-between gap-4 mb-3">
      <div className="h-5 bg-surface-elevated rounded-lg w-3/4" />
      <div className="h-6 bg-surface-elevated rounded-full w-20 shrink-0" />
    </div>
    <div className="space-y-2">
      <div className="h-3 bg-surface-elevated rounded w-full" />
      <div className="h-3 bg-surface-elevated rounded w-5/6" />
      <div className="h-3 bg-surface-elevated rounded w-4/6" />
    </div>
    <div className="mt-5 pt-4 border-t border-border-subtle flex justify-end">
      <div className="h-3 bg-surface-elevated rounded w-24" />
    </div>
  </div>
);

// ─── Main Notices Page ────────────────────────────────────────────────────────

export const NoticesPage: React.FC = () => {
  const profile = useAuthStore((state) => state.profile);
  const [notices, setNotices] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const isAdmin = Boolean(profile?.is_notice_admin) || profile?.role === 'admin';
  const studyYearLabel = profile?.study_year ? profile.study_year.split(':')[0].trim() : null;

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

  // Mark notices as seen when the page mounts → resets unread badge
  useEffect(() => {
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

  // Split: is_deleted notices always show as placeholder, pinned first otherwise
  const activeNotices = notices.filter((n) => !n.is_deleted);
  const deletedNotices = notices.filter((n) => n.is_deleted);

  const pinned = activeNotices.filter(isPinnedAndActive);
  const regular = activeNotices.filter((n) => !isPinnedAndActive(n));

  return (
    <div className="min-h-full bg-background px-4 py-6 md:px-6 md:py-8">
      <div className="max-w-2xl mx-auto">
        {/* Page Header */}
        <div className="flex items-start justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2.5 mb-2">
              <div className="w-9 h-9 rounded-xl bg-accent-amber-soft border border-amber-100 flex items-center justify-center text-accent-amber">
                <Megaphone className="w-4.5 h-4.5" />
              </div>
              <div className="text-[11px] font-bold text-accent-amber uppercase tracking-widest">
                Official Communications
              </div>
            </div>
            <h1 className="font-syne text-3xl font-extrabold text-text-primary tracking-tight">
              Notices
            </h1>
            <p className="text-sm text-text-secondary font-medium mt-1">
              {studyYearLabel ? (
                <>Showing notices for <span className="font-bold text-text-primary">{studyYearLabel}</span> & all students at your college.</>
              ) : (
                'Official notices from your college administration.'
              )}
            </p>
          </div>
          <button
            type="button"
            onClick={() => load(true)}
            disabled={isRefreshing}
            className="shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-xl bg-surface border border-border-subtle text-text-secondary hover:bg-surface-elevated text-xs font-bold transition-all shadow-2xs disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {/* Notice Admin Quick Link */}
        {isAdmin && (
          <Link
            to="/student/notices/admin"
            className="mb-6 flex items-center justify-between px-5 py-3.5 rounded-2xl bg-accent-amber-soft border border-accent-amber-soft hover:bg-amber-100/60 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-amber-500 flex items-center justify-center text-white">
                <Megaphone className="w-4 h-4" />
              </div>
              <div>
                <p className="text-sm font-bold text-amber-900">Notice Admin Panel</p>
                <p className="text-xs text-accent-amber font-medium">Compose and manage official notices</p>
              </div>
            </div>
            <ExternalLink className="w-4 h-4 text-accent-amber" />
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
            <div className="w-16 h-16 rounded-2xl bg-surface border border-border-subtle flex items-center justify-center text-text-secondary/70 mb-4">
              <Bell className="w-7 h-7 stroke-[1.5]" />
            </div>
            <p className="font-syne text-lg font-bold text-text-primary">No notices yet</p>
            <p className="text-sm text-text-secondary font-medium mt-1 max-w-xs">
              Official notices from your college administration will appear here.
            </p>
          </div>
        )}

        {/* Pinned */}
        {!isLoading && pinned.length > 0 && (
          <div className="space-y-4 mb-4">
            {pinned.map((notice) => (
              <NoticeCard key={notice.id} notice={notice} isAdmin={isAdmin} onSoftDelete={handleSoftDelete} />
            ))}
          </div>
        )}

        {/* Divider */}
        {!isLoading && pinned.length > 0 && (regular.length > 0 || deletedNotices.length > 0) && (
          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-border-subtle" />
            <span className="text-[11px] font-bold text-text-secondary/70 uppercase tracking-widest">Recent</span>
            <div className="flex-1 h-px bg-border-subtle" />
          </div>
        )}

        {/* Regular + deleted (interleaved by created_at order) */}
        {!isLoading && (regular.length > 0 || deletedNotices.length > 0) && (
          <div className="space-y-4">
            {[...regular, ...deletedNotices]
              .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
              .map((notice) =>
                notice.is_deleted ? (
                  <DeletedNoticePlaceholder key={notice.id} />
                ) : (
                  <NoticeCard key={notice.id} notice={notice} isAdmin={isAdmin} onSoftDelete={handleSoftDelete} />
                )
              )
            }
          </div>
        )}
      </div>
    </div>
  );
};
