import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  Bell,
  FileText,
  Download,
  Pin,
  Loader2,
  Megaphone,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Trash2,
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
import { supabase } from '../../lib/supabase';

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

function getAttachmentCategory(type: string) {
  if (type?.startsWith('image/')) return 'image';
  if (type === 'application/pdf') return 'pdf';
  return 'doc';
}

function getNoticeCategory(title: string): 'urgent' | 'event' | 'general' {
  if (!title) return 'general';
  const t = title.toLowerCase();
  if (t.includes('urgent') || t.includes('important') || t.includes('alert')) return 'urgent';
  if (t.includes('event') || t.includes('workshop') || t.includes('competition')) return 'event';
  return 'general';
}

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
  <div className="bg-white shadow-sm border border-dashed border-gray-200 rounded-2xl p-4 flex items-center gap-3 mb-3">
    <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center shrink-0">
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
}> = ({ notice, isAdmin, onSoftDelete, index }) => {
  const [expanded, setExpanded] = useState(false);
  const [deletingId, setDeletingId] = useState(false);
  const isLong = (notice.content?.length || 0) > 200;
  const attachments: any[] = Array.isArray(notice.attachments) ? notice.attachments : [];

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
      className="relative bg-white rounded-2xl p-4 shadow-sm border border-gray-100 transition-all duration-300 mb-3"
      style={{ animation: 'slideUpFade 0.4s ease both', animationDelay: `${index * 30}ms` }}
    >
      <div className="flex items-start justify-between gap-4 mb-2">
        <h2 className="text-[15px] font-bold text-gray-900 leading-snug flex-1">
          {notice.title}
        </h2>
        {isAdmin && (
          <button
            type="button"
            title="Delete notice"
            onClick={handleSoftDelete}
            disabled={deletingId}
            className="w-8 h-8 rounded-full hover:bg-rose-50 text-gray-300 hover:text-rose-500 flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 sm:opacity-100 shrink-0 -mt-1"
          >
            {deletingId ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
          </button>
        )}
      </div>

      {notice.content && (
        <p className={`text-sm text-gray-600 leading-relaxed whitespace-pre-wrap ${!expanded && isLong ? 'line-clamp-3' : ''}`}>
          {notice.content}
        </p>
      )}
      
      {isLong && (
        <button
          type="button"
          onClick={(e) => { e.preventDefault(); setExpanded(!expanded); }}
          className="mt-1.5 inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors"
        >
          {expanded
            ? <><ChevronUp className="w-3.5 h-3.5" /> Show less</>
            : <><ChevronDown className="w-3.5 h-3.5" /> Read more</>
          }
        </button>
      )}

      {attachments.length > 0 && (
        <div className="mt-3.5 flex flex-wrap gap-2.5">
          {attachments.map((att, idx) => (
            <AttachmentCard key={idx} att={att} />
          ))}
        </div>
      )}

      <div className="mt-2 text-right">
        <span className="text-xs text-gray-400 font-medium">{formatRelativeTime(notice.created_at)}</span>
      </div>
    </article>
  );
};

// ─── Main Notices Page ────────────────────────────────────────────────────────

export const NoticesPage: React.FC = () => {
  const { profile } = useAuthStore();
  const [notices, setNotices] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingOlder, setIsLoadingOlder] = useState(false);
  const [hasMoreOlder, setHasMoreOlder] = useState(true);
  
  const [isScrolledUp, setIsScrolledUp] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isReady, setIsReady] = useState(false);

  const loadMoreRef = useRef<HTMLDivElement>(null);
  
  const previousScrollHeight = useRef<number>(0);
  const previousScrollTop = useRef<number>(0);
  const isPrependingRef = useRef(false);

  const isAdmin = Boolean(profile?.is_notice_admin) || profile?.role === 'admin';
  const LIMIT = 15;

  // 1. Initial Load
  const loadInitial = useCallback(async () => {
    if (!profile?.college) return;
    setIsLoading(true);
    const res = await getNoticesForStudent({ 
      college: profile?.college, 
      studyYear: profile?.study_year || profile?.academic_year,
      limit: LIMIT,
    });
    
    if (res.data) {
      if (res.data.length < LIMIT) setHasMoreOlder(false);
      setNotices(res.data);
      if (res.data.length === 0) {
        setIsReady(true);
      }
      markNoticesAsSeen(profile?.id);
      window.dispatchEvent(new CustomEvent('notices-seen'));
    } else {
      toast.error('Failed to load notices');
    }
    setIsLoading(false);
  }, [profile?.college, profile?.study_year, profile?.academic_year]);

  // 2. Load Older
  const loadOlder = useCallback(async () => {
    if (!profile?.college || isLoadingOlder || !hasMoreOlder || notices.length === 0) return;
    setIsLoadingOlder(true);
    
    // Get the timestamp of the oldest notice currently in state (which is at index 0)
    const oldestTimestamp = notices[0].created_at;

    const res = await getNoticesForStudent({ 
      college: profile?.college, 
      studyYear: profile?.study_year || profile?.academic_year,
      limit: LIMIT,
      beforeTimestamp: oldestTimestamp
    });
    
    if (res.data) {
      if (res.data.length < LIMIT) setHasMoreOlder(false);
      
      if (res.data.length > 0) {
        // Record scroll metrics before updating state
        previousScrollHeight.current = document.documentElement.scrollHeight;
        previousScrollTop.current = document.documentElement.scrollTop;
        isPrependingRef.current = true;
        
        // Prepend older notices
        setNotices((prev) => [...res.data, ...prev]);
      }
    }
    setIsLoadingOlder(false);
  }, [profile?.college, profile?.study_year, profile?.academic_year, notices, isLoadingOlder, hasMoreOlder]);

  // Use Layout Effect to restore scroll position immediately after DOM paints new items
  useLayoutEffect(() => {
    if (!isReady && notices.length > 0) {
      // Synchronous scroll to bottom on first load BEFORE paint
      window.scrollTo(0, document.documentElement.scrollHeight);
      setIsReady(true);
      return;
    }

    if (isPrependingRef.current) {
      const newScrollHeight = document.documentElement.scrollHeight;
      const heightDifference = newScrollHeight - previousScrollHeight.current;
      
      // Adjust scroll top by the height of the new elements inserted at the top
      window.scrollTo(0, previousScrollTop.current + heightDifference);
      
      isPrependingRef.current = false;
    }
  }, [notices]);

  // 3. Setup Intersection Observer for Sentinel
  useEffect(() => {
    const target = loadMoreRef.current;
    if (!target || isLoading) return;
    
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMoreOlder && !isLoadingOlder) {
          loadOlder();
        }
      },
      { threshold: 0.1, rootMargin: '400px' } // Pre-fetch before user hits absolute top
    );
    
    observer.observe(target);
    return () => observer.unobserve(target);
  }, [loadOlder, hasMoreOlder, isLoading, isLoadingOlder]);

  // 4. Initial Trigger
  useEffect(() => { loadInitial(); }, [loadInitial]);

  // 5. Scroll Tracking for 'Jump to Latest'
  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = document.documentElement.scrollTop || document.body.scrollTop;
      const scrollHeight = document.documentElement.scrollHeight || document.body.scrollHeight;
      const clientHeight = document.documentElement.clientHeight || window.innerHeight;
      
      // If user is scrolled up more than 150px from bottom
      const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
      setIsScrolledUp(distanceFromBottom > 150);
      
      // If user returns to bottom naturally, clear unread count
      if (distanceFromBottom <= 50 && unreadCount > 0) {
        setUnreadCount(0);
        markNoticesAsSeen(profile?.id);
      }
    };
    
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [unreadCount, profile?.id]);

  const scrollToBottom = (smooth = true) => {
    window.scrollTo({
      top: document.documentElement.scrollHeight,
      behavior: smooth ? 'smooth' : 'auto'
    });
    setUnreadCount(0);
    markNoticesAsSeen(profile?.id);
  };

  // 6. Realtime Subscription
  useEffect(() => {
    if (!profile?.college) return;

    const channel = supabase.channel('official_notices_changes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'official_notices' }, (payload) => {
        const newNotice = payload.new;
        
        // Basic filtering to see if notice belongs to user's college
        if (newNotice.college !== 'All' && newNotice.college !== profile.college) return;
        
        setNotices(prev => [...prev, newNotice]);
        
        if (isScrolledUp) {
          setUnreadCount(c => c + 1);
        } else {
          // If already at bottom, just push them down
          setTimeout(() => scrollToBottom(true), 100);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.college, isScrolledUp]);

  const handleSoftDelete = (deletedId: string) => {
    setNotices((prev) => prev.map((n) => n.id === deletedId ? { ...n, is_deleted: true } : n));
  };

  return (
    <>
      <style>{`
        @keyframes slideUpFade {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0);    }
        }
      `}</style>

      {/* Main Container - bg-gray-50 enforced */}
      <div className={`min-h-[calc(100vh-64px)] bg-gray-50 pb-20 relative flex flex-col transition-opacity duration-200 ${isReady || (notices.length === 0 && !isLoading) ? 'opacity-100' : 'opacity-0'}`}>
        <div className="max-w-2xl mx-auto px-4 md:px-6 flex flex-col pt-4 flex-1 w-full">
          
          {/* Top Sentinel & Loading Indicator */}
          <div ref={loadMoreRef} className="py-2 flex justify-center w-full min-h-[40px]">
            {isLoadingOlder ? (
              <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
            ) : !hasMoreOlder && notices.length > 0 ? (
              <p className="text-xs font-medium text-gray-400 text-center py-2">
                You have reached the beginning of campus notices.
              </p>
            ) : (
              <div className="h-5" />
            )}
          </div>

          {/* Skeletons */}
          {isLoading && (
            <div className="space-y-3 mt-4">
              {[0, 80, 160].map((d) => (
                <div key={d} className="bg-white rounded-2xl border border-gray-100 p-5 pl-6 relative overflow-hidden" style={{ animation: 'slideUpFade 0.4s ease both', animationDelay: `${d}ms` }}>
                  <div className="h-4 bg-gray-100 rounded-full w-14 animate-pulse mb-3" />
                  <div className="h-5 bg-gray-100 rounded-lg w-3/4 mb-3 animate-pulse" />
                  <div className="h-3.5 bg-gray-100 rounded w-full animate-pulse mb-2" />
                  <div className="h-3.5 bg-gray-100 rounded w-5/6 animate-pulse" />
                </div>
              ))}
            </div>
          )}

          {/* Empty state */}
          {!isLoading && notices.length === 0 && (
            <div className="flex flex-col items-center justify-center py-28 text-center" style={{ animation: 'slideUpFade 0.4s ease both' }}>
              <div className="w-16 h-16 rounded-2xl bg-white border border-gray-100 shadow-sm flex items-center justify-center text-gray-300 mb-4">
                <Bell className="w-7 h-7 stroke-[1.5]" />
              </div>
              <p className="text-lg font-extrabold text-gray-800" style={{ fontFamily: 'SF Pro Display, system-ui, sans-serif' }}>No notices yet</p>
              <p className="text-sm text-gray-400 font-medium mt-1 max-w-xs">
                Official notices from your college administration will appear here.
              </p>
            </div>
          )}

          {/* Notice Feed (Standard DOM order) */}
          {!isLoading && notices.length > 0 && (
            <div className="flex flex-col">
              {notices.map((notice, index) => 
                notice.is_deleted ? (
                  <DeletedNoticePlaceholder key={notice.id} />
                ) : (
                  <NoticeCard
                    key={notice.id}
                    index={index}
                    notice={notice}
                    isAdmin={isAdmin}
                    onSoftDelete={handleSoftDelete}
                  />
                )
              )}
            </div>
          )}

          {/* Notice Admin Quick Link (Bottom) */}
          {isAdmin && !isLoading && (
            <Link
              to="/student/notices/admin"
              className="mt-auto mb-2 flex items-center gap-3 px-4 py-3 bg-white rounded-2xl border border-gray-200 active:scale-[0.99] transition-all group shadow-sm hover:shadow-md"
            >
              <div className="w-9 h-9 rounded-xl bg-gray-50 flex items-center justify-center text-gray-600 shrink-0 group-hover:scale-105 transition-transform">
                <Megaphone className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-gray-900">Notice Admin Panel</p>
                <p className="text-[11px] text-gray-500 font-medium">Publish &amp; manage notices</p>
              </div>
              <ExternalLink className="w-4 h-4 text-gray-400 shrink-0 group-hover:text-gray-600 transition-colors" />
            </Link>
          )}

        </div>
      </div>

      {/* Jump to Latest FAB */}
      {isScrolledUp && (
        <button
          onClick={() => scrollToBottom(true)}
          className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur-md shadow-lg border border-gray-200 rounded-full px-4 py-2 flex items-center gap-2 z-40 animate-in slide-in-from-bottom-10 fade-in duration-300 active:scale-95"
        >
          <ChevronDown className="w-4 h-4 text-blue-600" />
          <span className="text-sm font-semibold text-blue-600">Jump to Latest</span>
          
          {unreadCount > 0 && (
            <span className="ml-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center animate-in zoom-in duration-200 shadow-sm">
              {unreadCount}
            </span>
          )}
        </button>
      )}
    </>
  );
};
