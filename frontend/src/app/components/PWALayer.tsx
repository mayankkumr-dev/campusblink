import React, { useEffect, useState } from 'react';
import { Download, X, Wifi, Zap, Smartphone, Bell } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { subscribeToPush } from '../../lib/pushNotifications';
import { Logo } from './ui/Logo';
import { usePWAInstall } from '../../hooks/usePWAInstall';

/** iOS Share icon — matches the native Safari share button exactly. */
const IOSShareIcon = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="inline-block flex-shrink-0"
    aria-hidden="true"
  >
    <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
    <polyline points="16 6 12 2 8 6" />
    <line x1="12" y1="2" x2="12" y2="15" />
  </svg>
);

const INSTALL_BANNER_SHOW_DELAY_MS = 1200;
const INSTALL_FIRST_VISIT_DELAY_MS = 30_500;
const INSTALL_FIRST_VISIT_MIN_AGE_MS = 30_000;
const VISIT_COUNT_KEY = 'cb_visit_count';
const FIRST_SEEN_KEY = 'cb_first_seen_at';

export const PWALayer: React.FC = () => {
  const [showUpdate, setShowUpdate] = useState(false);
  const [showInstallSheet, setShowInstallSheet] = useState(false);
  const [showNotificationPrompt, setShowNotificationPrompt] = useState(false);
  const [sheetVisible, setSheetVisible] = useState(false);

  const {
    canInstall,
    isStandalone,
    isIOS,
    showIOSHint,
    promptInstall,
    dismissInstall,
    dismissIOSHint,
  } = usePWAInstall();

  // SW update banner listener
  useEffect(() => {
    const onNeedRefresh = () => setShowUpdate(true);
    window.addEventListener('cb-sw-update', onNeedRefresh as EventListener);
    return () => window.removeEventListener('cb-sw-update', onNeedRefresh as EventListener);
  }, []);

  // Show install sheet at the right moment
  useEffect(() => {
    if (isStandalone || !canInstall) return;

    const visits = Number(localStorage.getItem(VISIT_COUNT_KEY) || '0');
    const firstSeen = Number(localStorage.getItem(FIRST_SEEN_KEY) || `${Date.now()}`);

    let timer: ReturnType<typeof window.setTimeout>;

    if (visits >= 2) {
      // Return visitor — show quickly
      timer = window.setTimeout(() => {
        setShowInstallSheet(true);
        window.setTimeout(() => setSheetVisible(true), 50);
      }, INSTALL_BANNER_SHOW_DELAY_MS);
    } else if (Date.now() - firstSeen >= INSTALL_FIRST_VISIT_MIN_AGE_MS) {
      // First visit but been here a while
      timer = window.setTimeout(() => {
        setShowInstallSheet(true);
        window.setTimeout(() => setSheetVisible(true), 50);
      }, INSTALL_FIRST_VISIT_DELAY_MS);
    }

    return () => window.clearTimeout(timer);
  }, [canInstall, isStandalone]);

  // External listeners (e.g. from other components prompting install)
  useEffect(() => {
    const onInstallRequest = () => {
      if (!isStandalone && canInstall) {
        setShowInstallSheet(true);
        window.setTimeout(() => setSheetVisible(true), 50);
      }
    };
    const onOrderPrompt = () => {
      if (Notification.permission === 'default') {
        setShowNotificationPrompt(true);
      }
    };
    window.addEventListener('cb-open-install', onInstallRequest as EventListener);
    window.addEventListener('cb-order-placed-first-time', onOrderPrompt as EventListener);
    return () => {
      window.removeEventListener('cb-open-install', onInstallRequest as EventListener);
      window.removeEventListener('cb-order-placed-first-time', onOrderPrompt as EventListener);
    };
  }, [canInstall, isStandalone]);

  const closeSheet = (dismiss = true) => {
    setSheetVisible(false);
    window.setTimeout(() => setShowInstallSheet(false), 320);
    if (dismiss) dismissInstall(7);
  };

  const handleInstall = async () => {
    const accepted = await promptInstall();
    if (accepted) {
      closeSheet(false);
    } else {
      closeSheet(true);
    }
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
      if (userId) await subscribeToPush(userId);
    } catch {
      // Silently ignore — permission denied etc.
    } finally {
      setShowNotificationPrompt(false);
    }
  };

  return (
    <>
      {/* ── SW Update Toast ─────────────────────────────────────────────── */}
      {showUpdate && (
        <button
          onClick={handleUpdateNow}
          id="pwa-update-banner"
          className="fixed top-14 left-1/2 z-[120] -translate-x-1/2 rounded-full bg-[var(--accent-blue)] px-5 py-2 text-xs font-bold text-white shadow-lg hover:opacity-90 active:scale-95 transition-all"
          style={{ whiteSpace: 'nowrap' }}
        >
          ✨ Campus Blink just got better — tap to update
        </button>
      )}

      {/* ── Android/Chrome — Premium Install Bottom-Sheet ───────────────── */}
      {showInstallSheet && canInstall && !isStandalone && (
        <div
          className="fixed inset-0 z-[125]"
          onClick={() => closeSheet(true)}
          aria-modal="true"
          role="dialog"
          aria-label="Install Campus Blink"
        >
          {/* Backdrop */}
          <div
            className={`absolute inset-0 bg-black/40 backdrop-blur-[2px] transition-opacity duration-300 ${sheetVisible ? 'opacity-100' : 'opacity-0'}`}
          />

          {/* Sheet */}
          <div
            onClick={(e) => e.stopPropagation()}
            className={`absolute bottom-0 left-0 right-0 rounded-t-[28px] bg-white shadow-2xl transition-transform duration-300 ease-out ${sheetVisible ? 'translate-y-0' : 'translate-y-full'}`}
            style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 24px)' }}
          >
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="h-1 w-10 rounded-full bg-black/15" />
            </div>

            <div className="px-6 pt-4 pb-6">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <Logo alt="Campus Blink" className="h-12 w-12 rounded-2xl shadow-md" />
                  <div>
                    <p className="text-[17px] font-extrabold text-[#0A0F1E] leading-tight">Campus Blink</p>
                    <p className="text-[12px] text-[#64748B] font-medium">Your campus, one tap away</p>
                  </div>
                </div>
                <button
                  onClick={() => closeSheet(true)}
                  className="rounded-full p-2 text-[#64748B] hover:bg-black/5 transition-colors"
                  aria-label="Dismiss install prompt"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Benefits */}
              <div className="space-y-3 mb-6">
                {([
                  { icon: Wifi, text: 'Works offline — browse menus & notices without internet', color: '#2D4EF5' },
                  { icon: Zap, text: 'Loads instantly — no browser bar, full-screen experience', color: '#10B981' },
                  { icon: Smartphone, text: 'Feels native — home screen icon, push notifications', color: '#8B5CF6' },
                ] as const).map(({ icon: Icon, text, color }) => (
                  <div key={text} className="flex items-start gap-3">
                    <div
                      className="flex-shrink-0 mt-0.5 h-8 w-8 rounded-full flex items-center justify-center"
                      style={{ background: `${color}18` }}
                    >
                      <Icon className="h-4 w-4" style={{ color }} />
                    </div>
                    <p className="text-[13px] text-[#334155] leading-snug pt-1">{text}</p>
                  </div>
                ))}
              </div>

              {/* CTA */}
              <button
                id="pwa-install-cta"
                onClick={handleInstall}
                className="w-full rounded-2xl py-4 text-[15px] font-extrabold text-white transition-all active:scale-[0.97] shadow-lg"
                style={{ background: 'linear-gradient(135deg, #2D4EF5 0%, #6366f1 100%)' }}
              >
                Install App — It's Free
              </button>
              <button
                onClick={() => closeSheet(true)}
                className="w-full mt-3 py-2.5 text-[13px] font-semibold text-[#64748B] transition-colors hover:text-[#334155]"
              >
                Not now
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── iOS Safari — Step-by-Step Install Tooltip ───────────────────── */}
      {showIOSHint && !isStandalone && (
        <div
          className="fixed bottom-0 left-0 right-0 z-[125]"
          style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 16px)' }}
        >
          {/* Animated chevron pointing up toward the share button */}
          <div className="mx-auto w-fit mb-1">
            <div className="animate-bounce text-[#2D4EF5]">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M12 4l-8 8h5v8h6v-8h5z" />
              </svg>
            </div>
          </div>

          <div
            className="mx-4 rounded-2xl bg-white border border-black/8 shadow-2xl px-5 py-4"
            role="dialog"
            aria-label="iOS install instructions"
          >
            <div className="flex items-start gap-3">
              <Logo alt="" className="h-9 w-9 rounded-xl flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-[14px] font-extrabold text-[#0A0F1E] mb-1">Add to Home Screen</p>
                <p className="text-[12px] text-[#64748B] leading-relaxed">
                  Tap the{' '}
                  <span className="inline-flex items-center gap-0.5 font-semibold text-[#2D4EF5]">
                    <IOSShareIcon /> Share
                  </span>
                  {' '}button below, then select{' '}
                  <span className="font-semibold text-[#0A0F1E]">"Add to Home Screen"</span>
                  {' '}for the full app experience.
                </p>
              </div>
              <button
                onClick={dismissIOSHint}
                className="flex-shrink-0 rounded-full p-1.5 text-[#94A3B8] hover:bg-black/5"
                aria-label="Dismiss iOS install hint"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Step indicators */}
            <div className="mt-3 flex items-center gap-2">
              {[
                { step: '1', label: 'Tap Share' },
                { step: '2', label: 'Add to Home Screen' },
                { step: '3', label: 'Done!' },
              ].map(({ step, label }) => (
                <div key={step} className="flex items-center gap-1.5">
                  <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-[#2D4EF5] text-[10px] font-bold text-white">
                    {step}
                  </span>
                  <span className="text-[11px] font-medium text-[#475569]">{label}</span>
                  {step !== '3' && <span className="text-[#CBD5E1] text-xs">›</span>}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Notification Permission Modal ────────────────────────────────── */}
      {showNotificationPrompt && (
        <div
          className="fixed inset-0 z-[130] flex items-end justify-center bg-black/40 p-0 md:items-center md:p-4"
          onClick={() => setShowNotificationPrompt(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-t-[28px] md:rounded-2xl bg-white p-6 shadow-2xl"
            style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 24px)' }}
          >
            {/* Drag handle (mobile) */}
            <div className="flex justify-center mb-4 md:hidden">
              <div className="h-1 w-10 rounded-full bg-black/15" />
            </div>

            <div className="flex items-center gap-3 mb-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#FEF9C3]">
                <Bell className="h-5 w-5 text-[#92400E]" />
              </div>
              <div>
                <h3 className="text-[16px] font-extrabold text-[#0A0F1E]">Stay in the loop</h3>
                <p className="text-[12px] text-[#64748B]">Real-time alerts for your campus</p>
              </div>
            </div>
            <p className="text-[13px] text-[#475569] leading-relaxed mb-5">
              Get notified when your canteen order is ready, when someone replies to your post, or when there's an important campus notice.
            </p>
            <div className="flex flex-col gap-2">
              <button
                id="pwa-notification-enable"
                onClick={handleEnableNotifications}
                className="w-full rounded-xl bg-[#0A0F1E] py-3.5 text-[14px] font-bold text-white transition-all active:scale-[0.97]"
              >
                Enable Notifications
              </button>
              <button
                onClick={() => setShowNotificationPrompt(false)}
                className="w-full rounded-xl border border-black/10 py-3.5 text-[14px] font-semibold text-[#475569] transition-colors hover:bg-black/[0.02]"
              >
                Not now
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
