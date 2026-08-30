import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Bell,
  FileText,
  Download,
  Loader2,
  Megaphone,
  ChevronDown,
  Trash2,
  X,
  ExternalLink,
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

function getAttachmentCategory(type: string) {
  if (type?.startsWith('image/')) return 'image';
  if (type === 'application/pdf') return 'pdf';
  return 'doc';
}

import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';

// ─── Image Lightbox ──────────────────────────────────────────────────────────

const ImageLightbox: React.FC<{ src: string; alt: string; onClose: () => void }> = ({ src, alt, onClose }) => {
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleKey);
    
    // Status bar dynamic color sync
    let metaThemeColor = document.querySelector('meta[name="theme-color"]:not([media])') as HTMLMetaElement;
    const originalColor = metaThemeColor ? metaThemeColor.content : null;
    
    if (metaThemeColor) {
      metaThemeColor.content = '#000000';
    } else {
      metaThemeColor = document.createElement('meta');
      metaThemeColor.name = 'theme-color';
      metaThemeColor.content = '#000000';
      document.head.appendChild(metaThemeColor);
    }

    return () => {
      document.removeEventListener('keydown', handleKey);
      if (metaThemeColor) {
        if (originalColor) {
          metaThemeColor.content = originalColor;
        } else {
          metaThemeColor.content = document.documentElement.classList.contains('dark') ? '#101113' : '#F9FAFB';
        }
      }
    };
  }, [onClose]);

  const handleDownload = async () => {
    try {
      const response = await fetch(src);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = alt || 'download';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (e) {
      toast.error('Failed to download image');
    }
  };

  const handleShare = async () => {
    try {
      const response = await fetch(src);
      const blob = await response.blob();
      
      const mime = blob.type || 'image/jpeg';
      const ext = mime.split('/')[1] || 'jpg';
      const filename = alt ? `${alt.replace(/[^a-z0-9]/gi, '_')}.${ext}` : `shared_image.${ext}`;
      const file = new File([blob], filename, { type: mime });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: alt || 'Shared Image',
        });
      } else if (navigator.share) {
        // Fallback to URL if file sharing is not supported by browser
        await navigator.share({
          title: alt || 'Shared Image',
          url: src
        });
      } else {
        fallbackShare();
      }
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        fallbackShare();
      }
    }
  };

  const fallbackShare = () => {
    navigator.clipboard.writeText(src);
    toast.success('Link copied to clipboard!');
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-black/95 backdrop-blur-xl animate-in fade-in duration-200">
      {/* Pinch-to-Zoom Image (Full Screen) */}
      <div className="absolute inset-0">
        <TransformWrapper
          initialScale={1}
          minScale={1}
          maxScale={8}
          centerOnInit
          doubleClick={{ mode: 'zoomIn' }}
        >
          <TransformComponent wrapperStyle={{ width: '100%', height: '100%' }} contentStyle={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <img
              src={src}
              alt={alt}
              className="max-w-full max-h-full object-contain"
            />
          </TransformComponent>
        </TransformWrapper>
      </div>

      {/* Top Navigation Overlay */}
      <div className="absolute top-0 left-0 right-0 flex items-center justify-between p-4 z-50 text-white pointer-events-none pt-safe">
        <button onClick={onClose} className="pointer-events-auto w-10 h-10 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-md flex items-center justify-center transition-colors shadow-sm border border-white/10">
          <X className="w-5 h-5" />
        </button>
      </div>
      
      {/* Bottom Action Bar Overlay */}
      <div className="absolute bottom-0 left-0 right-0 flex items-center justify-center gap-8 p-6 z-50 pb-safe pointer-events-none bg-gradient-to-t from-black/80 via-black/40 to-transparent">
        <button onClick={handleDownload} className="pointer-events-auto flex flex-col items-center gap-1.5 text-white/90 hover:text-white transition-colors active:scale-95">
          <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-md border border-white/10 shadow-sm flex items-center justify-center">
            <Download className="w-5 h-5" />
          </div>
          <span className="text-[10px] font-medium uppercase tracking-wider text-white/90 shadow-black drop-shadow-md">Download</span>
        </button>
        
        <button onClick={handleShare} className="pointer-events-auto flex flex-col items-center gap-1.5 text-white/90 hover:text-white transition-colors active:scale-95">
          <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-md border border-white/10 shadow-sm flex items-center justify-center">
            <ExternalLink className="w-5 h-5" />
          </div>
          <span className="text-[10px] font-medium uppercase tracking-wider text-white/90 shadow-black drop-shadow-md">Share</span>
        </button>
      </div>
    </div>
  );
};

// ─── Notice Attachment Renderer ──────────────────────────────────────────────

const NoticeAttachment: React.FC<{ att: any }> = ({ att }) => {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const category = getAttachmentCategory(att.type || '');
  const isImage = category === 'image';
  const isPdf = category === 'pdf';

  useEffect(() => {
    if (lightboxOpen) {
      window.history.pushState({ lightbox: true }, '');
      const handlePopState = () => setLightboxOpen(false);
      window.addEventListener('popstate', handlePopState);
      return () => {
        window.removeEventListener('popstate', handlePopState);
      };
    }
  }, [lightboxOpen]);

  const closeLightbox = () => {
    if (window.history.state?.lightbox) {
      window.history.back();
    } else {
      setLightboxOpen(false);
    }
  };

  if (isImage) {
    return (
      <>
        {lightboxOpen && (
          <ImageLightbox src={att.url} alt={att.name} onClose={closeLightbox} />
        )}
        <button
          type="button"
          onClick={() => setLightboxOpen(true)}
          className="block w-full active:opacity-80 transition-opacity outline-none"
        >
          <img
            src={att.url}
            alt={att.name}
            className="w-full h-auto max-h-80 object-contain rounded-xl border border-gray-100 bg-gray-50 mt-3"
          />
        </button>
      </>
    );
  }

  return (
    <a
      href={att.url}
      target="_blank"
      rel="noopener noreferrer"
      className="bg-gray-50 rounded-xl p-3 flex items-center gap-3 mt-3 border border-gray-100 active:scale-[0.98] transition-transform w-full text-left group"
    >
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 bg-white border border-gray-100 shadow-sm ${isPdf ? 'text-red-500' : 'text-gray-600'}`}>
        <FileText className="w-5 h-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-gray-800">{att.name || 'Document'}</p>
        <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider mt-0.5">
          {isPdf ? 'PDF Document' : 'Attachment'}
        </p>
      </div>
      <Download className="w-4 h-4 text-gray-400 shrink-0 mr-1 group-hover:text-gray-700 transition-colors" />
    </a>
  );
};

// ─── Deleted Notice Placeholder ──────────────────────────────────────────────

const DeletedNoticePlaceholder: React.FC = () => (
  <div className="bg-white shadow-sm border border-dashed border-gray-200 rounded-2xl p-4 flex items-center gap-3 mb-4">
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
}> = ({ notice, isAdmin, onSoftDelete }) => {
  const [deletingId, setDeletingId] = useState(false);
  const attachments: any[] = Array.isArray(notice.attachments) ? notice.attachments : [];
  const senderName = notice.sender_name || 'Administration';

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
    <article className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 mb-3">
      {/* Header */}
      <div className="flex justify-between items-center mb-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0 text-blue-600">
            <Bell className="w-3.5 h-3.5" />
          </div>
          <span className="text-sm font-semibold text-gray-800 tracking-tight">{senderName}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs font-medium text-gray-400">{formatRelativeTime(notice.created_at)}</span>
          {isAdmin && (
            <button
              type="button"
              onClick={handleSoftDelete}
              disabled={deletingId}
              className="w-6 h-6 rounded-full hover:bg-rose-50 text-gray-300 hover:text-rose-500 flex items-center justify-center transition-all shrink-0"
            >
              {deletingId ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      {(notice.title?.trim() || notice.content?.trim()) && (
        <div>
          {notice.title?.trim() && (
            <h2 className="text-base font-bold text-gray-900 tracking-tight mb-1.5">
              {notice.title}
            </h2>
          )}
          {notice.content?.trim() && (
            <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">
              {notice.content}
            </p>
          )}
        </div>
      )}

      {/* Attachments */}
      {attachments.length > 0 && (
        <div className="flex flex-col mt-1">
          {attachments.map((att, idx) => (
            <NoticeAttachment key={idx} att={att} />
          ))}
        </div>
      )}
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

  const topSentinelRef = useRef<HTMLDivElement>(null);
  const bottomSentinelRef = useRef<HTMLDivElement>(null);

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
        setNotices((prev) => [...res.data, ...prev]);
      }
    }
    setIsLoadingOlder(false);
  }, [profile?.college, profile?.study_year, profile?.academic_year, notices, isLoadingOlder, hasMoreOlder]);

  // 3. Setup Intersection Observer for Sentinel (Load Older)
  useEffect(() => {
    const target = topSentinelRef.current;
    if (!target || isLoading) return;
    
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMoreOlder && !isLoadingOlder) {
          loadOlder();
        }
      },
      { threshold: 0.1, rootMargin: '400px' } 
    );
    
    observer.observe(target);
    return () => observer.disconnect();
  }, [loadOlder, hasMoreOlder, isLoading, isLoadingOlder]);

  // 4. Setup Intersection Observer for Bottom (Unread Tracking)
  useEffect(() => {
    const target = bottomSentinelRef.current;
    if (!target) return;
    
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsScrolledUp(!entry.isIntersecting);
        if (entry.isIntersecting && unreadCount > 0) {
          setUnreadCount(0);
          markNoticesAsSeen(profile?.id);
        }
      },
      { threshold: 0 }
    );
    
    observer.observe(target);
    return () => observer.disconnect();
  }, [unreadCount, profile?.id]);

  // 5. Initial Trigger
  useEffect(() => { loadInitial(); }, [loadInitial]);

  const scrollToBottom = () => {
    bottomSentinelRef.current?.scrollIntoView({ behavior: 'smooth' });
    setUnreadCount(0);
    markNoticesAsSeen(profile?.id);
  };

  // 6. Realtime Subscription
  useEffect(() => {
    if (!profile?.college) return;

    const channel = supabase.channel('official_notices_changes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'official_notices' }, (payload) => {
        const newNotice = payload.new;
        
        if (newNotice.college !== 'All' && newNotice.college !== profile.college) return;
        
        setNotices(prev => [...prev, newNotice]);
        
        if (isScrolledUp) {
          setUnreadCount(c => c + 1);
        } else {
          setTimeout(scrollToBottom, 100);
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
    <div className="flex flex-col h-[calc(100vh-64px)] bg-gray-50 relative">
      
      {/* Notice Admin Quick Link */}
      {isAdmin && (
        <div className="px-4 md:px-6 pt-4 shrink-0">
          <Link
            to="/student/notices/admin"
            className="w-full max-w-2xl mx-auto flex items-center justify-center gap-2 px-4 py-3 bg-orange-50 rounded-xl border border-orange-100 text-orange-700 active:opacity-80 transition-opacity"
          >
            <Megaphone className="w-4 h-4" />
            <span className="text-sm font-semibold">Notice Admin Panel</span>
          </Link>
        </div>
      )}

      {/* Main Reversed Scroll Container */}
      <div className="flex-1 overflow-y-auto flex flex-col-reverse px-4 md:px-6 relative pb-4">
        <div className="w-full max-w-2xl mx-auto flex flex-col-reverse">
          
          {/* Bottom Sentinel & Padding */}
          <div ref={bottomSentinelRef} className="h-6 w-full shrink-0" />

          {/* Empty state */}
          {!isLoading && notices.length === 0 && (
            <div className="flex flex-col items-center justify-center py-28 text-center opacity-100 mb-auto">
              <div className="w-16 h-16 rounded-2xl bg-white border border-gray-100 shadow-sm flex items-center justify-center text-gray-300 mb-4">
                <Bell className="w-7 h-7 stroke-[1.5]" />
              </div>
              <p className="text-lg font-bold text-gray-800 tracking-tight">No notices yet</p>
              <p className="text-sm text-gray-400 font-medium mt-1 max-w-xs">
                Official notices from your college administration will appear here.
              </p>
            </div>
          )}
          
          {/* Notice Feed */}
          {!isLoading && notices.length > 0 && (
            <>
              {[...notices].reverse().map((notice) => 
                notice.is_deleted ? (
                  <DeletedNoticePlaceholder key={notice.id} />
                ) : (
                  <NoticeCard
                    key={notice.id}
                    notice={notice}
                    isAdmin={isAdmin}
                    onSoftDelete={handleSoftDelete}
                  />
                )
              )}
            </>
          )}

          {/* Skeletons */}
          {isLoading && (
            <div className="space-y-4 mb-4 flex flex-col-reverse">
              {[1, 2, 3].map((d) => (
                <div key={d} className="bg-white rounded-2xl border border-gray-100 p-5 pl-6 relative overflow-hidden mb-4">
                  <div className="h-4 bg-gray-100 rounded-full w-1/3 animate-pulse mb-4" />
                  <div className="h-4 bg-gray-100 rounded-lg w-3/4 mb-2 animate-pulse" />
                  <div className="h-4 bg-gray-100 rounded w-full animate-pulse mb-2" />
                  <div className="h-4 bg-gray-100 rounded w-5/6 animate-pulse" />
                </div>
              ))}
            </div>
          )}
          
          {/* Top Sentinel & Loading Indicator */}
          <div ref={topSentinelRef} className="py-4 flex justify-center w-full min-h-[60px] shrink-0 mb-4 mt-2">
            {isLoadingOlder ? (
              <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
            ) : !hasMoreOlder && notices.length > 0 ? (
              <p className="text-xs font-medium text-gray-400 text-center bg-gray-100/50 px-3 py-1 rounded-full">
                You have reached the beginning of campus notices.
              </p>
            ) : (
              <div className="h-5" />
            )}
          </div>
          
        </div>
      </div>

      {/* Jump to Latest FAB */}
      {isScrolledUp && (
        <button
          onClick={scrollToBottom}
          className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur-md shadow-lg border border-gray-200 rounded-full px-4 py-2 flex items-center gap-2 z-40 animate-in fade-in zoom-in duration-200 active:scale-95"
        >
          <ChevronDown className="w-4 h-4 text-blue-600" />
          <span className="text-sm font-semibold text-blue-600">Jump to Latest</span>
          
          {unreadCount > 0 && (
            <span className="ml-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center shadow-sm">
              {unreadCount}
            </span>
          )}
        </button>
      )}
    </div>
  );
};
