import React, { useEffect, useState } from 'react';
import { Bell, ExternalLink, Trash2, X } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useNotificationStore } from '../../store/notificationStore';
import { clearAllNotifications, deleteNotification, getNotifications, markAllRead } from '../../api/notifications';
import { Link, useNavigate } from 'react-router';
import toast from 'react-hot-toast';

interface AlertSlidePanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AlertSlidePanel: React.FC<AlertSlidePanelProps> = ({ isOpen, onClose }) => {
  const profile = useAuthStore((state) => state.profile);
  const notifications = useNotificationStore((state) => state.notifications);
  const setNotifications = useNotificationStore((state) => state.setNotifications);
  const markStoreAllRead = useNotificationStore((state) => state.markAllRead);
  const removeNotification = useNotificationStore((state) => state.removeNotification);
  const clearNotifications = useNotificationStore((state) => state.clearNotifications);
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  useEffect(() => {
    if (!isOpen || !profile?.id) return;

    const loadNotifications = async () => {
      setIsLoading(true);
      const { data, error } = await getNotifications(profile.id);
      if (error) {
        toast.error('Failed to load alerts');
      } else {
        const nextNotifications = data || [];
        setNotifications(nextNotifications);

        const hasUnread = nextNotifications.some((notification: any) => !notification.is_read);
        if (hasUnread) {
          markStoreAllRead();
          const { error: readError } = await markAllRead(profile.id);
          if (readError) {
            console.error('Failed to auto-mark alerts as read', readError);
          }
        }
      }
      setIsLoading(false);
    };

    loadNotifications();
  }, [isOpen, profile?.id, setNotifications, markStoreAllRead]);

  const handleDeleteAlert = async (alertId: string) => {
    const { error } = await deleteNotification(alertId);
    if (error) {
      toast.error('Failed to delete alert');
      return;
    }
    removeNotification(alertId);
    toast.success('Alert deleted');
  };

  const handleClearAllAlerts = async () => {
    if (!profile?.id) return;
    const confirmed = window.confirm('Clear all alerts? This cannot be undone.');
    if (!confirmed) return;
    const { error } = await clearAllNotifications(profile.id);
    if (error) {
      toast.error('Failed to clear all alerts');
      return;
    }
    clearNotifications();
    toast.success('All alerts cleared');
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-[75] bg-black/30 backdrop-blur-[1px] transition-opacity duration-300 ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Slide-in Panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Alerts"
        className={`fixed left-0 top-0 h-full z-[76] flex flex-col bg-[var(--bg-primary)] border-r border-black/[0.08] shadow-[6px_0_40px_rgba(0,0,0,0.14)] transition-transform duration-300 ease-in-out w-full md:w-[390px] ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex h-[70px] shrink-0 items-center justify-between px-6 border-b border-black/[0.06] bg-[var(--bg)]">
          <h2 className="font-syne font-extrabold text-[22px] text-[var(--text-primary)] tracking-tight flex items-center gap-2">
            <Bell className="w-5 h-5 text-[var(--yellow)]" />
            Alerts
          </h2>
          <div className="flex items-center gap-2">
            {notifications.length > 0 && (
              <button
                type="button"
                onClick={handleClearAllAlerts}
                className="flex items-center gap-1.5 rounded-full border border-black/10 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-[var(--text-primary)] hover:bg-black/5 transition-colors"
                title="Clear all"
              >
                Clear
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-full text-[var(--text-secondary)] hover:bg-black/[0.06] hover:text-[var(--text-primary)] transition-colors"
              aria-label="Close alerts"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto w-full custom-scrollbar">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 text-[var(--text-secondary)]">
              <div className="w-6 h-6 border-2 border-[var(--yellow)] border-t-transparent rounded-full animate-spin mb-3"></div>
              <p className="font-sans text-[15px] font-medium">Loading alerts...</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 px-8 text-center text-[var(--text-secondary)]">
              <div className="w-12 h-12 rounded-full bg-[var(--bg-secondary)] flex items-center justify-center mb-4 text-2xl">
                ✨
              </div>
              <p className="font-sans text-[16px] font-semibold text-[var(--text-primary)] mb-1">No alerts yet</p>
              <p className="font-sans text-[14px]">You are all caught up.</p>
            </div>
          ) : (
            <div className="px-5 py-5 space-y-3">
              {notifications.map((n: any) => (
                <div
                  key={n.id}
                  onClick={() => {
                    if (n.link) {
                      navigate(n.link);
                      onClose();
                    }
                  }}
                  className={`group relative rounded-xl border p-4 transition-all duration-200 ${
                    n.is_read ? 'border-black/5 bg-[var(--bg)] shadow-sm' : 'border-[var(--yellow)]/40 bg-[var(--yellow)]/5 shadow-[0_2px_8px_rgba(255,214,0,0.15)]'
                  } ${n.link ? 'cursor-pointer hover:border-black/15 hover:shadow-md hover:-translate-y-[1px]' : ''}`}
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--bg-tertiary)] text-[15px] shadow-sm">
                      {n.type === 'announcement' ? '📣' : '🔔'}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-sans font-bold text-[var(--text-primary)] text-[15px] leading-snug">{n.title}</h3>
                      <p className="font-sans text-[14px] text-[var(--text-secondary)] mt-1 leading-relaxed line-clamp-2">{n.message}</p>
                      <p className="font-sans text-[11px] font-bold tracking-wide text-[var(--text-muted)] mt-2.5 uppercase">
                        {n.created_at ? new Date(n.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : ''}
                      </p>
                    </div>
                  </div>

                  <div className="absolute right-3 top-3 opacity-0 transition-opacity group-hover:opacity-100 flex items-center gap-1.5 backdrop-blur-sm bg-[color:rgba(255,255,255,0.9)] p-1 rounded-lg border border-black/5">
                    {n.link && (
                      <Link
                        to={n.link}
                        onClick={(event) => {
                          event.stopPropagation();
                          onClose();
                        }}
                        className="flex h-7 w-7 items-center justify-center text-[var(--text-primary)] hover:bg-[var(--yellow)]/20 rounded-md transition-colors"
                        title="Open link"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Link>
                    )}
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        handleDeleteAlert(n.id);
                      }}
                      className="flex h-7 w-7 items-center justify-center text-[#ff3b3b] hover:bg-[#ff3b3b]/10 rounded-md transition-colors"
                      title="Delete alert"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
};
