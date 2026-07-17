import { useState, useEffect, useMemo, useCallback } from 'react';

const INSTALL_DISMISS_KEY = 'cb_install_dismiss_until';
const VISIT_COUNT_KEY = 'cb_visit_count';
const FIRST_SEEN_KEY = 'cb_first_seen_at';
const IOS_HINT_KEY = 'cb_ios_install_hint_shown';

/** True if the app is running in standalone PWA mode (installed). */
export function isStandaloneMode(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true
  );
}

/** True if the browser is iOS Safari (the only iOS browser that doesn't support beforeinstallprompt). */
export function isIOSSafari(): boolean {
  if (typeof window === 'undefined') return false;
  const ua = window.navigator.userAgent.toLowerCase();
  const isIOS = /iphone|ipad|ipod/.test(ua);
  // Chrome iOS, Firefox iOS, Edge iOS — exclude them; only native Safari supports A2HS via share sheet
  const isSafari = /safari/.test(ua) && !/crios|fxios|edgios|opios|chrome/.test(ua);
  return isIOS && isSafari;
}

interface UsePWAInstallResult {
  /** True if the browser has fired beforeinstallprompt and install is possible. */
  canInstall: boolean;
  /** True if the app is currently running as an installed PWA. */
  isStandalone: boolean;
  /** True if this is iOS Safari (needs manual share → add to home screen flow). */
  isIOS: boolean;
  /** True if the iOS install hint should be shown (only on first visit per session). */
  showIOSHint: boolean;
  /** Trigger the native browser install prompt. Returns whether the user accepted. */
  promptInstall: () => Promise<boolean>;
  /** Dismiss the install banner for a given number of days (default: 7). */
  dismissInstall: (days?: number) => void;
  /** Dismiss the iOS install hint. */
  dismissIOSHint: () => void;
}

/**
 * Manages the full PWA install prompt lifecycle:
 * - Intercepts beforeinstallprompt to prevent the generic browser banner
 * - Tracks visit count and first-seen timestamp
 * - Exposes promptInstall() to trigger the polished custom install flow
 * - Handles iOS Safari separately (no beforeinstallprompt support)
 */
export function usePWAInstall(): UsePWAInstallResult {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showIOSHint, setShowIOSHint] = useState(false);

  const isStandalone = useMemo(() => isStandaloneMode(), []);
  const isIOS = useMemo(() => isIOSSafari(), []);

  // Track visits and first-seen on mount
  useEffect(() => {
    try {
      const visits = Number(localStorage.getItem(VISIT_COUNT_KEY) || '0') + 1;
      localStorage.setItem(VISIT_COUNT_KEY, String(visits));
      if (!localStorage.getItem(FIRST_SEEN_KEY)) {
        localStorage.setItem(FIRST_SEEN_KEY, String(Date.now()));
      }
    } catch {
      // localStorage may be unavailable in some security contexts
    }
  }, []);

  // Intercept the browser's native install prompt
  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault(); // Block the generic browser banner
      setDeferredPrompt(e);
    };
    const onInstalled = () => {
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handler as EventListener);
    window.addEventListener('appinstalled', onInstalled as EventListener);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler as EventListener);
      window.removeEventListener('appinstalled', onInstalled as EventListener);
    };
  }, []);

  // Show iOS hint once per session if not in standalone mode
  useEffect(() => {
    if (!isStandalone && isIOS) {
      const alreadyShown = sessionStorage.getItem(IOS_HINT_KEY);
      if (!alreadyShown) {
        setShowIOSHint(true);
        sessionStorage.setItem(IOS_HINT_KEY, '1');
      }
    }
  }, [isStandalone, isIOS]);

  const isDismissed = useCallback((): boolean => {
    try {
      const until = Number(localStorage.getItem(INSTALL_DISMISS_KEY) || '0');
      return until > Date.now();
    } catch {
      return false;
    }
  }, []);

  const canInstall = Boolean(deferredPrompt) && !isStandalone && !isDismissed();

  const promptInstall = useCallback(async (): Promise<boolean> => {
    if (!deferredPrompt) return false;
    try {
      deferredPrompt.prompt();
      const result = await deferredPrompt.userChoice;
      setDeferredPrompt(null);
      return result?.outcome === 'accepted';
    } catch {
      setDeferredPrompt(null);
      return false;
    }
  }, [deferredPrompt]);

  const dismissInstall = useCallback((days = 7): void => {
    try {
      const until = Date.now() + days * 24 * 60 * 60 * 1000;
      localStorage.setItem(INSTALL_DISMISS_KEY, String(until));
    } catch {
      // ignore
    }
  }, []);

  const dismissIOSHint = useCallback((): void => {
    setShowIOSHint(false);
  }, []);

  return {
    canInstall,
    isStandalone,
    isIOS,
    showIOSHint,
    promptInstall,
    dismissInstall,
    dismissIOSHint,
  };
}
