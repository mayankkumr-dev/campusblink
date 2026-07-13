import React, { useEffect, useMemo, useState } from 'react';
import { Download, X, Bell } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { subscribeToPush } from '../../lib/pushNotifications';
import { Logo } from './ui/Logo';

const INSTALL_DISMISS_KEY = 'cb_install_dismiss_until';
const VISIT_COUNT_KEY = 'cb_visit_count';
const FIRST_SEEN_KEY = 'cb_first_seen_at';

function isStandaloneMode() {
  return window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true;
}

function isIOSSafari() {
  const ua = window.navigator.userAgent.toLowerCase();
  const isIOS = /iphone|ipad|ipod/.test(ua);
  const isSafari = /safari/.test(ua) && !/crios|fxios|edgios|opios/.test(ua);
  return isIOS && isSafari;
}

export const PWALayer: React.FC = () => {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [showUpdate, setShowUpdate] = useState(false);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [showIOSBanner, setShowIOSBanner] = useState(false);
  const [showNotificationPrompt, setShowNotificationPrompt] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  const inStandalone = useMemo(() => isStandaloneMode(), []);

  useEffect(() => {
    const visits = Number(localStorage.getItem(VISIT_COUNT_KEY) || '0') + 1;
    localStorage.setItem(VISIT_COUNT_KEY, String(visits));
    if (!localStorage.getItem(FIRST_SEEN_KEY)) {
      localStorage.setItem(FIRST_SEEN_KEY, String(Date.now()));
    }

    const onOnline = () => setIsOffline(false);
    const onOffline = () => setIsOffline(true);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);

    const onNeedRefresh = () => setShowUpdate(true);
    const onBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    const onInstallRequest = () => {
      if (!inStandalone) setShowInstallBanner(true);
    };

    const onOrderPrompt = () => {
      if (Notification.permission === 'default') {
        setShowNotificationPrompt(true);
      }
    };

    const onAppInstalled = () => {
      setShowInstallBanner(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('cb-sw-update', onNeedRefresh as EventListener);
    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt as EventListener);
    window.addEventListener('cb-open-install', onInstallRequest as EventListener);
    window.addEventListener('cb-order-placed-first-time', onOrderPrompt as EventListener);
    window.addEventListener('appinstalled', onAppInstalled as EventListener);

    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
      window.removeEventListener('cb-sw-update', onNeedRefresh as EventListener);
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt as EventListener);
      window.removeEventListener('cb-open-install', onInstallRequest as EventListener);
      window.removeEventListener('cb-order-placed-first-time', onOrderPrompt as EventListener);
      window.removeEventListener('appinstalled', onAppInstalled as EventListener);
    };
  }, [inStandalone]);

  useEffect(() => {
    if (inStandalone) return;

    const dismissUntil = Number(localStorage.getItem(INSTALL_DISMISS_KEY) || '0');
    if (dismissUntil > Date.now()) return;

    const visits = Number(localStorage.getItem(VISIT_COUNT_KEY) || '0');
    const firstSeen = Number(localStorage.getItem(FIRST_SEEN_KEY) || `${Date.now()}`);

    if (deferredPrompt && visits >= 2) {
      const quick = window.setTimeout(() => setShowInstallBanner(true), 1200);
      return () => window.clearTimeout(quick);
    }

    const timer = window.setTimeout(() => {
      if (deferredPrompt && Date.now() - firstSeen >= 30_000) {
        setShowInstallBanner(true);
      }
    }, 30_500);

    return () => window.clearTimeout(timer);
  }, [deferredPrompt, inStandalone]);

  useEffect(() => {
    if (!inStandalone && isIOSSafari()) {
      const shown = sessionStorage.getItem('cb_ios_install_hint_shown');
      if (!shown) {
        setShowIOSBanner(true);
        sessionStorage.setItem('cb_ios_install_hint_shown', '1');
      }
    }
  }, [inStandalone]);

  const dismissInstallForSevenDays = () => {
    const next = Date.now() + 7 * 24 * 60 * 60 * 1000;
    localStorage.setItem(INSTALL_DISMISS_KEY, String(next));
    setShowInstallBanner(false);
  };

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const result = await deferredPrompt.userChoice;
    if (result?.outcome === 'accepted') {
      setShowInstallBanner(false);
    } else {
      dismissInstallForSevenDays();
    }
    setDeferredPrompt(null);
  };

  const handleUpdateNow = async () => {
    const reg = await navigator.serviceWorker.getRegistration();
    if (reg?.waiting) {
      reg.waiting.postMessage({ type: 'SKIP_WAITING' });
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        window.location.reload();
      }, { once: true });
    } else {
      window.location.reload();
    }
  };

  const handleEnableNotifications = async () => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id;
      if (!userId) {
        setShowNotificationPrompt(false);
        return;
      }

      await subscribeToPush(userId);
    } catch {
      // Ignore permission failures silently; UX handled by pre-prompt.
    } finally {
      setShowNotificationPrompt(false);
    }
  };

  return (
    <>
      {isOffline && (
        <div className="fixed top-3 left-1/2 -translate-x-1/2 z-[120] rounded-md bg-black/90 px-4 py-2 text-xs font-bold text-[var(--yellow)] shadow-strong">
          You are offline
        </div>
      )}

      {showUpdate && (
        <button
          onClick={handleUpdateNow}
          className="fixed top-12 left-1/2 -translate-x-1/2 z-[120] rounded-md bg-[var(--yellow)] px-5 py-2 text-xs font-bold text-[var(--text-primary)] shadow-strong"
        >
          Campus Blink just got better! Tap to update ✨
        </button>
      )}

      {showInstallBanner && !inStandalone && deferredPrompt && (
        <div className="fixed left-4 right-4 z-[120] rounded-lg border border-black/10 bg-white p-4 shadow-strong bottom-4 mb-[env(safe-area-inset-bottom)]">
          <div className="flex items-center gap-3">
            <Logo alt="Campus Blink" className="h-10 w-10 rounded-lg" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-extrabold text-[var(--text-primary)]">Install Campus Blink</p>
              <p className="truncate text-xs text-[var(--text-secondary)]">Works offline · Faster · No browser bar</p>
            </div>
            <button onClick={handleInstall} className="rounded-lg bg-[var(--yellow)] px-3 py-2 text-xs font-bold text-[var(--text-primary)]">
              Install
            </button>
            <button onClick={dismissInstallForSevenDays} className="rounded-lg p-2 text-[var(--text-secondary)]" aria-label="Dismiss install banner">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {showIOSBanner && !inStandalone && (
        <div className="fixed left-4 right-4 z-[120] rounded-lg border border-black/10 bg-white p-4 shadow-strong bottom-4 mb-[env(safe-area-inset-bottom)]">
          <div className="flex items-start gap-3">
            <Download className="mt-1 h-5 w-5 text-[var(--text-primary)]" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-[var(--text-primary)]">Install on iPhone</p>
              <p className="text-xs text-[var(--text-secondary)]">Install on iPhone: tap Share button then Add to Home Screen</p>
            </div>
            <button onClick={() => setShowIOSBanner(false)} className="rounded-lg p-2 text-[var(--text-secondary)]" aria-label="Dismiss iOS install banner">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {showNotificationPrompt && (
        <div className="fixed inset-0 z-[130] flex items-end justify-center bg-black/35 p-4 md:items-center">
          <div className="w-full max-w-md rounded-lg bg-white p-5 shadow-strong">
            <div className="mb-3 flex items-center gap-2">
              <Logo alt="Campus Blink" className="h-5 w-5 rounded-md object-contain" />
              <h3 className="text-base font-extrabold text-[var(--text-primary)]">Get notified when your order is ready?</h3>
            </div>
            <p className="mb-5 text-sm text-[var(--text-secondary)]">Allow notifications so Campus Blink can alert you when your status changes.</p>
            <div className="flex items-center gap-3">
              <button onClick={handleEnableNotifications} className="flex-1 rounded-lg bg-[var(--yellow)] px-4 py-2.5 text-sm font-bold text-[var(--text-primary)]">
                Yes
              </button>
              <button onClick={() => setShowNotificationPrompt(false)} className="flex-1 rounded-lg border border-black/10 px-4 py-2.5 text-sm font-bold text-[var(--text-primary)]">
                No thanks
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
