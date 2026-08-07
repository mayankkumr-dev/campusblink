import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import { useAuthStore } from '../../store/authStore';
import { useNotificationStore } from '../../store/notificationStore';
import { getNotifications, markAllRead, deleteNotification } from '../../api/notifications';
import { ArrowLeft, ExternalLink, Trash2, Calendar, MapPin, Store, Bell, AlertTriangle, MessageSquare, Briefcase, FileText } from 'lucide-react';
import toast from 'react-hot-toast';

function getAlertAppearanceForDetail(notification: any) {
  const type = notification.type?.toLowerCase() || 'system';
  if (type === 'marketplace' || type.includes('listing')) {
    return { bgClass: 'bg-emerald-100/50 text-emerald-600', Icon: Store };
  }
  if (type === 'community' || type.includes('post') || type.includes('reply')) {
    return { bgClass: 'bg-purple-100/50 text-purple-600', Icon: MessageSquare };
  }
  if (type === 'campus' || type.includes('notice')) {
    return { bgClass: 'bg-blue-100/50 text-[#0066cc]', Icon: FileText };
  }
  if (type.includes('warning') || type.includes('alert') || type.includes('banned')) {
    return { bgClass: 'bg-rose-100/50 text-rose-600', Icon: AlertTriangle };
  }
  if (type === 'print' || type === 'canteen' || type.includes('order')) {
    return { bgClass: 'bg-amber-100/50 text-amber-600', Icon: Briefcase };
  }
  return { bgClass: 'bg-[var(--bg-secondary)] text-[var(--text-secondary)]', Icon: Bell };
}

export const NotificationDetailPage: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const profile = useAuthStore((state) => state.profile);
  const notifications = useNotificationStore((state) => state.notifications);
  const setNotifications = useNotificationStore((state) => state.setNotifications);
  const removeNotification = useNotificationStore((state) => state.removeNotification);
  
  const [notification, setNotification] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadAlert = async () => {
      if (!profile?.id || !id) return;

      setIsLoading(true);
      // Try to find it in store first
      let alert = notifications.find((n) => String(n.id) === id);

      // If not in store, fetch from backend
      if (!alert) {
        const { data } = await getNotifications(profile.id);
        if (data) {
          setNotifications(data);
          alert = data.find((n: any) => String(n.id) === id);
        }
      }

      setNotification(alert || null);
      setIsLoading(false);
    };

    loadAlert();
  }, [id, profile?.id, notifications.length, setNotifications]);

  const handleDelete = async () => {
    if (!notification?.id) return;
    const { error } = await deleteNotification(notification.id);
    if (error) {
      toast.error('Failed to delete alert');
      return;
    }
    removeNotification(notification.id);
    toast.success('Alert deleted');
    navigate(-1);
  };

  if (isLoading) {
    return (
      <div className="p-4 md:p-8 bg-[var(--bg-primary)] min-h-screen">
        <div className="max-w-3xl mx-auto">
          <div className="animate-pulse">
            <div className="h-6 bg-[var(--bg-secondary)] rounded w-24 mb-6"></div>
            <div className="h-10 bg-[var(--bg-secondary)] rounded w-3/4 mb-4"></div>
            <div className="h-32 bg-[var(--bg-secondary)] rounded w-full"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!notification) {
    return (
      <div className="p-4 md:p-8 bg-[var(--bg-primary)] min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-bold text-[var(--text-primary)] mb-2">Alert not found</h2>
          <p className="text-[var(--text-secondary)] mb-6">The alert you're looking for doesn't exist or has been deleted.</p>
          <button 
            onClick={() => navigate(-1)}
            className="px-6 py-2 bg-[var(--accent)] text-white rounded-lg font-semibold"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const { bgClass, Icon } = getAlertAppearanceForDetail(notification);

  return (
    <div className="p-4 md:p-8 bg-[var(--bg-primary)] min-h-screen">
      <div className="max-w-3xl mx-auto">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-sm font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Alerts
        </button>

        <div className="bg-[var(--bg)] border border-[var(--text-primary)]/10 rounded-2xl p-6 md:p-8 shadow-sm">
          <div className="flex items-start gap-5">
            <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ${bgClass}`}>
              <Icon className="h-7 w-7 stroke-[2]" />
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-4">
                <h1 className="text-xl md:text-2xl font-bold text-[var(--text-primary)] leading-tight">
                  {notification.title}
                </h1>
                
                <button
                  type="button"
                  onClick={handleDelete}
                  className="shrink-0 p-2 text-[var(--text-secondary)] hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg transition-colors"
                  aria-label="Delete alert"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
              
              <div className="mt-2 text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)] flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                {notification.created_at ? new Date(notification.created_at).toLocaleString([], { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric', 
                  hour: 'numeric', 
                  minute: '2-digit' 
                }) : 'Unknown date'}
              </div>

              <div className="mt-6 text-sm md:text-base text-[var(--text-secondary)] leading-relaxed whitespace-pre-wrap">
                {notification.message}
              </div>

              {notification.link && (
                <div className="mt-8 pt-6 border-t border-[var(--text-primary)]/10">
                  <a
                    href={notification.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-[var(--accent)] text-white text-sm font-semibold rounded-xl hover:bg-[var(--accent)]/90 transition-colors w-full sm:w-auto"
                  >
                    View Details
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
