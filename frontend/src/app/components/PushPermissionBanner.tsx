import React, { useEffect, useState } from 'react';
import { Bell, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../store/authStore';
import { usePushNotifications } from '../../hooks/usePushNotifications';

/**
 * PushPermissionBanner
 *
 * A compact bottom-right card that prompts the user to enable push
 * notifications. Shown only when:
 * - The user is logged in
 * - They haven't subscribed yet
 * - They haven't dismissed it in the last 7 days
 *
 * Aesthetic: strict light-mode — pure white bg, ultra-soft drop-shadow.
 * No dark: classes anywhere in this component.
 */
export const PushPermissionBanner: React.FC = () => {
  const profile = useAuthStore((state) => state.profile);
  const userId = profile?.id ?? null;

  const { shouldShowPrompt, isLoading, isSubscribed, subscribe, dismiss } =
    usePushNotifications(userId);

  // In-component message listener: show an in-app toast when a push arrives
  // while the app is open (mirrors the SW postMessage behaviour).
  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.data?.type === 'push-notification' && event.data?.payload?.title) {
        toast(event.data.payload.title, { icon: '🔔', duration: 4000 });
      }
    };
    navigator.serviceWorker?.addEventListener('message', onMessage);
    return () => navigator.serviceWorker?.removeEventListener('message', onMessage);
  }, []);

  const [visible, setVisible] = useState(false);

  // Derived visibility: gate on shouldShowPrompt from the hook
  useEffect(() => {
    setVisible(shouldShowPrompt && !isSubscribed);
  }, [shouldShowPrompt, isSubscribed]);

  const handleEnable = async () => {
    const success = await subscribe();
    if (!success) {
      if (typeof window !== 'undefined' && Notification.permission === 'denied') {
        toast.error('Notifications are blocked. Please allow them in browser settings.');
      } else {
        toast.error('Unable to enable notifications right now.');
      }
      return;
    }
    toast.success('Notifications enabled! 🔔');
    setVisible(false);
  };

  const handleNotNow = () => {
    dismiss();
    setVisible(false);
  };

  if (!visible || !userId) return null;

  return (
    <div
      className="fixed bottom-4 left-4 right-4 z-[99] mx-auto max-w-md md:bottom-6 md:left-auto md:right-6 md:max-w-sm"
      role="complementary"
      aria-label="Enable notifications prompt"
    >
      <div
        className="rounded-2xl border border-gray-100 bg-white p-4"
        style={{ boxShadow: '0 8px 40px rgba(0, 0, 0, 0.08), 0 1px 0 rgba(0,0,0,0.03)' }}
      >
        <div className="flex items-start gap-3">
          {/* Bell icon chip */}
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-50">
            <Bell className="h-5 w-5 text-amber-600" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="text-[15px] font-semibold text-gray-900">Stay in the loop</h3>
                <p className="mt-0.5 text-[13px] leading-5 text-gray-500">
                  Get notified when your order is ready, someone likes your post, and more.
                </p>
              </div>
              <button
                type="button"
                onClick={handleNotNow}
                className="flex-shrink-0 rounded-full p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                aria-label="Dismiss"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-3 flex items-center gap-2">
              <button
                type="button"
                id="push-banner-enable-btn"
                onClick={handleEnable}
                disabled={isLoading}
                className="rounded-lg bg-gray-900 px-4 py-2 text-[13px] font-semibold text-white transition-all hover:bg-gray-800 active:scale-95 disabled:opacity-60"
              >
                {isLoading ? 'Enabling…' : 'Enable Notifications'}
              </button>
              <button
                type="button"
                onClick={handleNotNow}
                className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-2 text-[13px] font-semibold text-gray-600 transition-colors hover:bg-gray-100"
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
