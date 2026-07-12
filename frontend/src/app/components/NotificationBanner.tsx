import React, { useEffect, useState } from 'react';
import { Bell, X } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';

const PROMPT_STORAGE_KEY = 'lastNotificationPromptDate';
const COOLDOWN_MS = 86_400_000;

export const NotificationBanner: React.FC = () => {
  const user = useAuthStore((state) => state.user);
  const [pathname, setPathname] = useState(() =>
    typeof window !== 'undefined' ? window.location.pathname : '/'
  );
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);

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

  useEffect(() => {
    const syncVisibility = () => {
      if (typeof window === 'undefined' || !('Notification' in window)) {
        setVisible(false);
        return;
      }

      if (window.Notification.permission === 'granted') {
        window.localStorage.removeItem(PROMPT_STORAGE_KEY);
        setVisible(false);
        return;
      }

      const lastPromptDate = Number(window.localStorage.getItem(PROMPT_STORAGE_KEY));
      if (!Number.isFinite(lastPromptDate)) {
        setVisible(true);
        return;
      }

      setVisible(Date.now() - lastPromptDate >= COOLDOWN_MS);
    };

    syncVisibility();
  }, []);

  const saveCooldown = () => {
    window.localStorage.setItem(PROMPT_STORAGE_KEY, String(Date.now()));
  };

  const hideBanner = () => {
    saveCooldown();
    setVisible(false);
  };

  const handleAllow = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;

    setLoading(true);
    try {
      const permission = await window.Notification.requestPermission();
      if (permission === 'granted') {
        window.localStorage.removeItem(PROMPT_STORAGE_KEY);
        setVisible(false);
        return;
      }

      saveCooldown();
      setVisible(false);
    } finally {
      setLoading(false);
    }
  };

  const isPublicOrLandingPage = ['/', '/login', '/register', '/reset-password', '/terms', '/privacy', '/about', '/contact'].includes(pathname);

  if (!visible || !user || isPublicOrLandingPage) return null;

  return (
    <div className="fixed left-4 right-4 top-[calc(env(safe-area-inset-top)+1rem)] z-[99] mx-auto max-w-2xl md:left-auto md:right-6 md:max-w-sm select-none">
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-4 shadow-2xl opacity-100">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#FEF9C3] text-[var(--yellow-dark)]">
            <Bell className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="text-[16px] font-semibold text-[var(--text-primary)]">Enable notifications</h3>
                <p className="mt-1 text-[14px] leading-6 text-[var(--text-secondary)]">Get updates for orders, replies, and important campus activity.</p>
              </div>
              <button type="button" onClick={hideBanner} className="rounded-full p-1 text-[var(--text-muted)] hover:bg-black/5 hover:text-[var(--text-primary)]" aria-label="Dismiss notification banner">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleAllow}
                disabled={loading}
                className="rounded-lg bg-[var(--text-primary)] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-black/85 disabled:opacity-60"
              >
                {loading ? 'Requesting...' : 'Allow'}
              </button>
              <button
                type="button"
                onClick={hideBanner}
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
