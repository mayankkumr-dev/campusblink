import React, { useEffect, useState, useCallback } from 'react';
import {
  Bell,
  ExternalLink,
  Trash2,
  X,
  AlertTriangle,
  Printer,
  UtensilsCrossed,
  Megaphone,
  CheckCircle2,
  UserPlus,
  ChevronRight,
  ChevronLeft,
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useNotificationStore } from '../../store/notificationStore';
import { clearAllNotifications, deleteNotification, getNotifications, markAllRead } from '../../api/notifications';
import { Link, useNavigate } from 'react-router';
import toast from 'react-hot-toast';

interface AlertSlidePanelProps {
  isOpen: boolean;
  onClose: () => void;
}

function getAlertAppearance(n: any) {
  const t = `${n.type || ''} ${n.title || ''} ${n.message || ''}`.toLowerCase();
  if (t.includes('reject') || t.includes('cancel') || t.includes('error') || t.includes('fail')) {
    return { bgClass: 'bg-rose-50 text-rose-600', Icon: AlertTriangle };
  }
  if (t.includes('print')) {
    return { bgClass: 'bg-blue-50 text-blue-600', Icon: Printer };
  }
  if (t.includes('canteen') || t.includes('order') || t.includes('food')) {
    return { bgClass: 'bg-amber-50 text-amber-600', Icon: UtensilsCrossed };
  }
  if (t.includes('announce') || n.type === 'announcement') {
    return { bgClass: 'bg-purple-50 text-purple-600', Icon: Megaphone };
  }
  if (t.includes('success') || t.includes('ready') || t.includes('complete') || t.includes('paid')) {
    return { bgClass: 'bg-emerald-50 text-emerald-600', Icon: CheckCircle2 };
  }
  return { bgClass: 'bg-slate-50 text-slate-600', Icon: Bell };
}

function groupNotifications(notifications: any[]) {
  const groups: Record<string, any[]> = {
    'Today': [],
    'Yesterday': [],
    'Last 7 days': [],
    'Last 30 days': [],
    'Older': [],
  };

  const now = new Date();
  now.setHours(0, 0, 0, 0);

  notifications.forEach((n) => {
    const d = new Date(n.created_at);
    d.setHours(0, 0, 0, 0);
    const diffTime = now.getTime() - d.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) groups['Today'].push(n);
    else if (diffDays === 1) groups['Yesterday'].push(n);
    else if (diffDays <= 7) groups['Last 7 days'].push(n);
    else if (diffDays <= 30) groups['Last 30 days'].push(n);
    else groups['Older'].push(n);
  });

  return groups;
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
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [showFollowRequests, setShowFollowRequests] = useState(false);
  const LIMIT = 30;

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const loadAlerts = useCallback(async (isLoadMore = false) => {
    if (!profile?.id) return;
    
    if (isLoadMore) setIsLoadingMore(true);
    else setIsLoading(true);

    const currentOffset = isLoadMore ? offset : 0;
    const { data, error } = await getNotifications(profile.id, LIMIT, currentOffset);
    
    if (error) {
      toast.error('Failed to load alerts');
    } else {
      const fetched = data || [];
      if (fetched.length < LIMIT) {
        setHasMore(false);
      } else {
        setHasMore(true);
      }
      
      const nextNotifications = isLoadMore ? [...notifications, ...fetched] : fetched;
      setNotifications(nextNotifications);
      setOffset(currentOffset + fetched.length);

      const hasUnread = nextNotifications.some((n: any) => !n.is_read);
      if (hasUnread) {
        markStoreAllRead();
        await markAllRead(profile.id);
      }
    }
    
    setIsLoading(false);
    setIsLoadingMore(false);
  }, [profile?.id, offset, notifications, setNotifications, markStoreAllRead]);

  // Initial load when panel opens
  useEffect(() => {
    if (isOpen) {
      setOffset(0);
      setHasMore(true);
      setShowFollowRequests(false);
      loadAlerts(false);
    }
  }, [isOpen]);

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

  const groupedNotifs = groupNotifications(notifications);
  const groupKeys = ['Today', 'Yesterday', 'Last 7 days', 'Last 30 days', 'Older'];

  return (
    <>
      <div
        className={`fixed inset-0 z-[75] bg-slate-900/25 backdrop-blur-sm transition-opacity duration-300 ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Alerts"
        className={`fixed left-0 top-0 h-full z-[76] flex flex-col bg-white border-r border-slate-100 shadow-[0_20px_60px_rgba(0,0,0,0.14)] transition-transform duration-300 ease-in-out w-full md:w-[410px] font-sans ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="sticky top-0 z-10 flex h-[72px] shrink-0 items-center justify-between border-b border-slate-100 bg-white/95 px-6 backdrop-blur-md">
          <div className="flex items-center gap-2.5">
            {showFollowRequests ? (
              <button 
                onClick={() => setShowFollowRequests(false)} 
                className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 transition-colors -ml-2"
                aria-label="Back to alerts"
              >
                <ChevronLeft className="h-5 w-5 stroke-[2.2]" />
              </button>
            ) : (
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600 shadow-2xs">
                <Bell className="h-4.5 w-4.5 stroke-[2.2]" />
              </div>
            )}
            <h2 className="font-syne text-xl font-extrabold tracking-tight text-slate-900">
              {showFollowRequests ? 'Follow requests' : 'Alerts'}
            </h2>
          </div>

          <div className="flex items-center gap-2">
            {notifications.length > 0 && (
              <button
                type="button"
                onClick={handleClearAllAlerts}
                className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs transition-colors hover:bg-slate-50"
                title="Clear all alerts"
              >
                Clear
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
              aria-label="Close alerts"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto pb-6">
          {showFollowRequests ? (
            <div className="flex flex-col items-center justify-center px-8 py-28 text-center">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-slate-50 border border-slate-100 text-slate-400 shadow-sm">
                <UserPlus className="h-6 w-6 stroke-[1.5]" />
              </div>
              <h3 className="font-syne text-base font-bold text-slate-900">No pending requests</h3>
              <p className="mt-1 text-xs text-slate-500 max-w-xs">
                When people ask to follow you, their requests will show up here.
              </p>
            </div>
          ) : isLoading ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent mb-3"></div>
              <p className="text-xs font-semibold text-slate-500">Loading your alerts...</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-8 py-28 text-center">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-slate-50 text-slate-400 shadow-sm">
                <Bell className="h-6 w-6 stroke-[1.5]" />
              </div>
              <h3 className="font-syne text-base font-bold text-slate-900">No new alerts</h3>
              <p className="mt-1 text-xs text-slate-500 max-w-xs">
                You are all caught up! Orders, campus updates, and print notifications will appear here.
              </p>
            </div>
          ) : (
            <div className="flex flex-col">
              {/* Follow Requests Block */}
              <div className="px-6 py-4 mb-2">
                <button 
                  type="button"
                  onClick={() => setShowFollowRequests(true)}
                  className="w-full group flex items-center justify-between rounded-2xl bg-white border border-slate-200/60 p-4 shadow-sm hover:shadow-md hover:border-slate-300 transition-all cursor-pointer text-left"
                >
                  <div className="flex items-center gap-4">
                    <div className="relative flex h-12 w-12 items-center justify-center rounded-full bg-slate-50 border border-slate-100">
                      <UserPlus className="h-5 w-5 text-slate-600" />
                      <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white shadow-sm">
                        3
                      </span>
                    </div>
                    <div>
                      <h3 className="font-syne text-[15px] font-bold text-slate-900 group-hover:text-blue-600 transition-colors">Follow requests</h3>
                      <p className="text-xs text-slate-500 mt-0.5">Approve or ignore requests</p>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-slate-400 group-hover:text-blue-600 transition-colors" />
                </button>
              </div>

              {groupKeys.map((group) => {
                const groupItems = groupedNotifs[group];
                if (groupItems.length === 0) return null;
                
                return (
                  <div key={group} className="mb-2">
                    <div className="px-6 py-3 bg-white/95 sticky top-0 z-10 backdrop-blur-sm">
                      <h4 className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                        {group}
                      </h4>
                    </div>
                    <div className="flex flex-col gap-1 px-3">
                      {groupItems.map((n: any) => {
                        const { bgClass, Icon } = getAlertAppearance(n);
                        const isUnread = !n.is_read;
                        return (
                          <div
                            key={n.id}
                            onClick={() => {
                              if (n.link) {
                                navigate(n.link);
                                onClose();
                              }
                            }}
                            className={`group relative flex items-start gap-4 px-4 py-4 rounded-2xl transition-all duration-200 ${
                              isUnread ? 'bg-blue-50/40 shadow-[0_2px_12px_rgba(37,99,235,0.03)]' : 'hover:bg-slate-50/80'
                            } ${n.link ? 'cursor-pointer' : ''}`}
                          >
                            <div
                              className={`mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${bgClass}`}
                            >
                              <Icon className="h-5 w-5 stroke-[2]" />
                            </div>

                            <div className="min-w-0 flex-1 pr-10">
                              <div className="flex items-center gap-2 mb-0.5">
                                <h3 className="font-syne text-sm font-bold text-slate-900 leading-snug">
                                  {n.title}
                                </h3>
                                {isUnread && (
                                  <span className="h-1.5 w-1.5 rounded-full bg-blue-600 shrink-0" title="Unread" />
                                )}
                              </div>
                              <p className="text-xs leading-relaxed text-slate-600 line-clamp-3">
                                {n.message}
                              </p>
                              <p className="mt-2 text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                                {n.created_at
                                  ? new Date(n.created_at).toLocaleString([], {
                                      month: 'short',
                                      day: 'numeric',
                                      hour: 'numeric',
                                      minute: '2-digit',
                                    })
                                  : ''}
                              </p>
                            </div>

                            <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 transition-opacity group-hover:opacity-100 flex flex-col gap-1">
                              {n.link && (
                                <Link
                                  to={n.link}
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    onClose();
                                  }}
                                  className="flex h-8 w-8 items-center justify-center rounded-full bg-white shadow-sm text-slate-500 transition-colors hover:text-slate-800 hover:shadow-md"
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
                                className="flex h-8 w-8 items-center justify-center rounded-full bg-white shadow-sm text-slate-400 transition-colors hover:text-rose-600 hover:shadow-md"
                                title="Delete alert"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              {hasMore && notifications.length >= LIMIT && (
                <div className="px-6 py-6 flex justify-center">
                  <button
                    onClick={() => loadAlerts(true)}
                    disabled={isLoadingMore}
                    className="px-5 py-2.5 rounded-full bg-slate-50 border border-slate-200/60 text-xs font-bold text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors disabled:opacity-50 flex items-center gap-2"
                  >
                    {isLoadingMore ? (
                      <>
                        <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-slate-400 border-t-transparent" />
                        Loading...
                      </>
                    ) : (
                      'Show more'
                    )}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
};
