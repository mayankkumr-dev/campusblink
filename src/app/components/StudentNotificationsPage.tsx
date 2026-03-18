import React, { useEffect, useState } from 'react';
import { Bell, ExternalLink, Trash2 } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useNotificationStore } from '../../store/notificationStore';
import { clearAllNotifications, deleteNotification, getNotifications, markAllRead } from '../../api/notifications';
import { Link, useNavigate } from 'react-router';
import toast from 'react-hot-toast';

export const StudentNotificationsPage: React.FC = () => {
  const profile = useAuthStore((state) => state.profile);
  const notifications = useNotificationStore((state) => state.notifications);
  const setNotifications = useNotificationStore((state) => state.setNotifications);
  const markStoreAllRead = useNotificationStore((state) => state.markAllRead);
  const removeNotification = useNotificationStore((state) => state.removeNotification);
  const clearNotifications = useNotificationStore((state) => state.clearNotifications);
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);

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
    <div className="p-4 md:p-8 bg-[#FAFAF8] min-h-full">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="font-syne text-3xl font-bold text-[#0D0D0D] flex items-center gap-3">
            <Bell className="w-7 h-7 text-[#FFD600]" />
            Alerts
          </h1>
          {notifications.length > 0 && (
            <button
              type="button"
              onClick={handleClearAllAlerts}
              className="inline-flex items-center gap-2 rounded-md border border-[#0D0D0D]/15 px-3 py-2 text-xs font-semibold text-[#0D0D0D] hover:bg-white"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Clear all
            </button>
          )}
        </div>

        {isLoading ? (
          <div className="rounded-lg border border-[#0D0D0D]/10 bg-white p-6 text-[#6B6B6B]">Loading alerts...</div>
        ) : notifications.length === 0 ? (
          <div className="rounded-lg border border-[#0D0D0D]/10 bg-white p-10 text-center">
            <p className="font-sans text-[#6B6B6B]">No alerts yet. You are all caught up.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map((n: any) => (
              <div
                key={n.id}
                onClick={() => {
                  if (n.link) navigate(n.link);
                }}
                className={`rounded-lg border bg-white p-4 md:p-5 transition-colors ${
                  n.is_read ? 'border-[#0D0D0D]/10' : 'border-[#FFD600]/40'
                } ${n.link ? 'cursor-pointer hover:bg-[#FFFCF5]' : ''}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex items-start gap-3">
                    <div className="mt-0.5 flex h-7 w-7 items-center justify-center rounded-md bg-[#F7F5F0] text-sm">
                      {n.type === 'announcement' ? '📣' : '🔔'}
                    </div>
                    <div>
                    <h2 className="font-sans font-bold text-[#0D0D0D] truncate">{n.title}</h2>
                    <p className="font-sans text-sm text-[#6B6B6B] mt-1">{n.message}</p>
                    <p className="font-sans text-xs text-[#9B9B9B] mt-2">
                      {n.created_at ? new Date(n.created_at).toLocaleString() : ''}
                    </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {n.link && (
                      <Link
                        to={n.link}
                        onClick={(event) => event.stopPropagation()}
                        className="inline-flex items-center gap-1 text-xs font-bold text-[#0057FF] hover:underline"
                      >
                        Open
                        <ExternalLink className="w-3 h-3" />
                      </Link>
                    )}
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        handleDeleteAlert(n.id);
                      }}
                      className="inline-flex items-center gap-1 rounded-md border border-[#0D0D0D]/15 px-2.5 py-1.5 text-xs font-semibold text-[#6B6B6B] hover:bg-[#F7F5F0]"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};