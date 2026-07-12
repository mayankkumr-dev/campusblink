import React, { useEffect, useState } from 'react';
import { Bell, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../store/authStore';
import {
  dismissPromptForSevenDays,
  getPushUnavailableReason,
  isPushSubscribed,
  subscribeToPush,
  shouldSuppressPrompt,
} from '../../lib/pushNotifications';

export const PushPermissionBanner: React.FC = () => {
  const profile = useAuthStore((state) => state.profile);
  const [visible, setVisible] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;

    const sync = async () => {
      if (!profile?.id) {
        if (active) setVisible(false);
        return;
      }

      const unavailableReason = await getPushUnavailableReason();
      if (unavailableReason) {
        if (active) setVisible(false);
        return;
      }

      const subscribed = await isPushSubscribed();
      if (!active) return;

      setIsSubscribed(subscribed);
      setVisible(!subscribed && !shouldSuppressPrompt());
    };

    sync();

    const onMessage = (event: MessageEvent) => {
      if (event.data?.type === 'push-notification' && event.data?.payload?.title) {
        toast(event.data.payload.title, {
          icon: '🔔',
          duration: 4000,
        });
      }
    };

    navigator.serviceWorker?.addEventListener('message', onMessage);

    return () => {
      active = false;
      navigator.serviceWorker?.removeEventListener('message', onMessage);
    };
  }, [profile?.id]);

  const handleEnable = async () => {
    if (!profile?.id) return;

    const unavailableReason = await getPushUnavailableReason();
    if (unavailableReason) {
      toast.error(unavailableReason);
      return;
    }

    setLoading(true);
    const success = await subscribeToPush(profile.id);
    setLoading(false);

    if (!success) {
      if (Notification.permission === 'denied') {
        toast.error('Notifications are blocked. Please allow them in browser settings.');
      } else {
        toast.error('Unable to enable notifications right now.');
      }
      return;
    }

    setIsSubscribed(true);
    setVisible(false);
    toast.success('Notifications enabled! 🔔');
  };

  const handleNotNow = () => {
    dismissPromptForSevenDays();
    setVisible(false);
  };

  if (!visible || isSubscribed || !profile?.id) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-[99] mx-auto max-w-md md:bottom-6 md:left-auto md:right-6 md:max-w-sm">
      <div className="animate-in slide-in-from-bottom-4 md:slide-in-from-right-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-2xl opacity-100">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#FEF9C3] text-[var(--yellow-dark)]">
            <Bell className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="font-sans text-[16px] font-semibold text-[var(--text-primary)]">Stay in the loop</h3>
                <p className="mt-1 text-[14px] leading-6 text-[var(--text-secondary)]">Get notified when your order is ready, someone likes your post, and more.</p>
              </div>
              <button type="button" onClick={handleNotNow} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-4 flex items-center gap-2">
              <button
                type="button"
                onClick={handleEnable}
                disabled={loading}
                className="rounded-lg bg-[var(--text-primary)] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-black/85 disabled:opacity-60"
              >
                {loading ? 'Enabling...' : 'Enable Notifications'}
              </button>
              <button
                type="button"
                onClick={handleNotNow}
                className="rounded-lg border border-black/10 px-4 py-2.5 text-sm font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-primary)]"
              >
                Not now
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
