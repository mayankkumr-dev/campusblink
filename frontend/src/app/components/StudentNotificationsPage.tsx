import React, { useEffect, useState } from 'react';
import { Bell, ExternalLink, Trash2 } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useNotificationStore } from '../../store/notificationStore';
import { clearAllNotifications, deleteNotification, getNotifications, markAllRead } from '../../api/notifications';
import { Link, useNavigate } from 'react-router';
import toast from 'react-hot-toast';
import { NotificationsSkeleton } from './BoneyardSkeletons';
import { getAlertAppearance, clusterConsecutiveNotifications } from './AlertSlidePanel';

export const StudentNotificationsPage: React.FC = () => {
  const profile = useAuthStore((state) => state.profile);
  const notifications = useNotificationStore((state) => state.notifications);
  const setNotifications = useNotificationStore((state) => state.setNotifications);
  const markStoreAllRead = useNotificationStore((state) => state.markAllRead);
  const removeNotification = useNotificationStore((state) => state.removeNotification);
  const clearNotifications = useNotificationStore((state) => state.clearNotifications);
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [expandedClusters, setExpandedClusters] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const loadNotifications = async () => {
      if (!profile?.id) {
        setIsLoading(false);
        return;
      }

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
  }, [profile?.id, setNotifications, markStoreAllRead]);

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
    <NotificationsSkeleton loading={isLoading} name="student-notifications">
    <div className="p-4 md:p-8 bg-[var(--bg-primary)] min-h-full">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="font-syne text-3xl font-bold text-[var(--text-primary)] flex items-center gap-3">
            <Bell className="w-7 h-7 text-[var(--yellow)]" />
            Alerts
          </h1>
          {notifications.length > 0 && (
            <button
              type="button"
              onClick={handleClearAllAlerts}
              className="inline-flex items-center gap-2 rounded-md border border-[var(--text-primary)]/15 px-3 py-2 text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--bg)]"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Clear all
            </button>
          )}
        </div>

        {isLoading ? (
          <div className="rounded-lg border border-[var(--text-primary)]/10 bg-[var(--bg)] p-6 text-[var(--text-secondary)]">Loading alerts...</div>
        ) : notifications.length === 0 ? (
          <div className="rounded-lg border border-[var(--text-primary)]/10 bg-[var(--bg)] p-10 text-center">
            <p className="font-sans text-[var(--text-secondary)]">No alerts yet. You are all caught up.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {clusterConsecutiveNotifications(notifications, false).map((cluster) => {
              const isExpanded = expandedClusters[cluster.id] || false;
              const { bgClass, Icon } = getAlertAppearance(cluster.items[0], false);

              if (cluster.isGrouped && !isExpanded) {
                return (
                  <div
                    key={cluster.id}
                    onClick={() => setExpandedClusters((prev) => ({ ...prev, [cluster.id]: true }))}
                    className="rounded-xl border border-[var(--text-primary)]/10 bg-[var(--bg)] p-4 md:p-5 transition-all cursor-pointer hover:bg-[var(--bg-primary)] flex items-center justify-between gap-4 shadow-xs"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${bgClass}`}>
                        <Icon className="h-5 w-5 stroke-[2]" />
                      </div>
                      <div className="min-w-0">
                        <h2 className="font-syne font-bold text-[var(--text-primary)] truncate text-sm md:text-base">
                          {cluster.items.length} new {cluster.category.toLowerCase()} alerts
                        </h2>
                        <p className="font-sans text-xs text-[var(--text-secondary)] truncate">
                          Tap to expand grouped updates
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400">
                        {cluster.items.length}
                      </span>
                    </div>
                  </div>
                );
              }

              return (
                <div key={cluster.id} className={cluster.isGrouped ? 'space-y-2 pl-3 border-l-2 border-blue-500/20 ml-2 my-2' : ''}>
                  {cluster.isGrouped && (
                    <div
                      onClick={() => setExpandedClusters((prev) => ({ ...prev, [cluster.id]: false }))}
                      className="flex items-center justify-between px-3 py-1 text-xs font-semibold text-[var(--text-secondary)] cursor-pointer hover:text-[var(--text-primary)]"
                    >
                      <span>Grouped {cluster.category.toLowerCase()}s ({cluster.items.length})</span>
                      <span className="text-[11px] text-blue-500 font-bold">Collapse</span>
                    </div>
                  )}
                  {cluster.items.map((n: any) => {
                    const itemApp = getAlertAppearance(n, false);
                    return (
                      <div
                        key={n.id}
                        onClick={() => {
                          if (n.link) navigate(n.link);
                        }}
                        className={`rounded-xl border bg-[var(--bg)] p-4 md:p-5 transition-all shadow-xs ${
                          n.is_read ? 'border-[var(--text-primary)]/10' : 'border-[var(--yellow)]/40'
                        } ${n.link ? 'cursor-pointer hover:bg-[var(--bg-primary)]' : ''}`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0 flex items-start gap-3.5">
                            <div className={`mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${itemApp.bgClass}`}>
                              <itemApp.Icon className="h-5 w-5 stroke-[2]" />
                            </div>
                            <div className="min-w-0">
                              <h2 className="font-syne font-bold text-[var(--text-primary)] truncate text-sm md:text-base">{n.title}</h2>
                              <p className="font-sans text-sm text-[var(--text-secondary)] mt-1 leading-relaxed">{n.message}</p>
                              <p className="font-sans text-xs text-[var(--text-muted)] mt-2 font-semibold uppercase tracking-wide">
                                {n.created_at ? new Date(n.created_at).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : ''}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {n.link && (
                              <Link
                                to={n.link}
                                onClick={(event) => event.stopPropagation()}
                                className="inline-flex items-center gap-1 text-xs font-bold text-[var(--accent)] hover:underline"
                              >
                                Open
                                <ExternalLink className="w-3.5 h-3.5" />
                              </Link>
                            )}
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                handleDeleteAlert(n.id);
                              }}
                              className="inline-flex items-center gap-1 rounded-lg border border-[var(--text-primary)]/15 px-2.5 py-1.5 text-xs font-semibold text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] transition-colors"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
    </NotificationsSkeleton>
  );
};