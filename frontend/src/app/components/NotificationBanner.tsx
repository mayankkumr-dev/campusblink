import React, { useEffect, useState } from 'react';
import { Bell, X } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { usePushNotifications } from '../../hooks/usePushNotifications';

/**
 * NotificationBanner
 *
 * A fallback top-anchored banner shown to authenticated users who have not
 * subscribed to push notifications and haven't dismissed in 24 hours.
 *
 * Bug fixed: previously called Notification.requestPermission() but never
 * called subscribeToPush(), so the push subscription was never created.
 * Now delegates entirely to usePushNotifications.subscribe() which handles
 * both steps atomically.
 *
 * Aesthetic: strict light-mode only — pure white, gray-50, soft drop-shadow.
 * No dark: classes anywhere.
 *
 * Note: This banner is now secondary to PushOnboardingModal (which appears
 * once on first visit). This banner acts as a persistent reminder on subsequent
 * visits within the 24-hour cooldown window.
 */
export const NotificationBanner: React.FC = () => {
  const user = useAuthStore((state) => state.user);
  const profile = useAuthStore((state) => state.profile);
  const userId = profile?.id ?? null;

  const { shouldShowPrompt, isSubscribed, isLoading, subscribe, dismiss } =
    usePushNotifications(userId);

  const [pathname, setPathname] = useState(() =>
    typeof window !== 'undefined' ? window.location.pathname : '/'
  );

  // Track route changes (SPA navigation)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const syncPath = () => setPathname(window.location.pathname);
    window.addEventListener('popstate', syncPath);
    const interval = setInterval(syncPath, 400);
    return () => {
      window.removeEventListener('popstate', syncPath);
      clearInterval(interval);
    };
  }, []);

  const isPublicOrLandingPage = [
    '/', '/login', '/register', '/reset-password',
    '/terms', '/privacy', '/about', '/contact', '/account-restricted',
  ].includes(pathname);

  const handleAllow = async () => {
    // subscribe() → calls requestPermission() then saves subscription to backend
    const success = await subscribe();
    if (!success && typeof window !== 'undefined' && Notification.permission === 'denied') {
      // Permission was denied — hide banner so we don't nag them
      dismiss();
    }
  };

  const handleDismiss = () => {
    dismiss(); // 7-day suppression via the hook
  };

  if (!user || !shouldShowPrompt || isSubscribed || isPublicOrLandingPage) return null;

  return (
    <div
      className="fixed left-4 right-4 top-[calc(env(safe-area-inset-top)+1rem)] z-[99] mx-auto max-w-2xl select-none md:left-auto md:right-6 md:max-w-sm"
      role="complementary"
      aria-label="Enable notifications prompt"
    >
      <div
        className="rounded-2xl border border-gray-100 bg-white px-4 py-4"
        style={{ boxShadow: '0 8px 40px rgba(0, 0, 0, 0.08), 0 1px 0 rgba(0,0,0,0.03)' }}
      >
        <div className="flex items-start gap-3">
          {/* Bell icon chip */}
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-50">
            <Bell className="h-5 w-5 text-amber-600" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="text-[15px] font-semibold text-gray-900">Enable notifications</h3>
                <p className="mt-0.5 text-[13px] leading-5 text-gray-500">
                  Get updates for orders, replies, and important campus activity.
                </p>
              </div>
              <button
                type="button"
                onClick={handleDismiss}
                className="flex-shrink-0 rounded-full p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                aria-label="Dismiss notification banner"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button
                type="button"
                id="notification-banner-allow-btn"
                onClick={handleAllow}
                disabled={isLoading}
                className="rounded-lg bg-gray-900 px-4 py-2 text-[13px] font-semibold text-white transition-all hover:bg-gray-800 active:scale-95 disabled:opacity-60"
              >
                {isLoading ? 'Enabling…' : 'Allow'}
              </button>
              <button
                type="button"
                onClick={handleDismiss}
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
