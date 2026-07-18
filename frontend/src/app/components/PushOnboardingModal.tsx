import React, { useEffect, useRef, useState } from 'react';
import { Bell, BellRing, BookOpen, Megaphone, MessageCircle, ShoppingBag, X } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { usePushNotifications } from '../../hooks/usePushNotifications';
import toast from 'react-hot-toast';

// ─── Timing / storage ────────────────────────────────────────────────────────
const ONBOARDING_DELAY_MS = 4_500;   // grace period before modal appears
const ONBOARDING_SHOWN_KEY = 'cb_push_onboarding_shown_v2';

// ─── Benefit list ─────────────────────────────────────────────────────────────
const BENEFITS = [
  {
    id: 'orders',
    Icon: ShoppingBag,
    color: '#2D4EF5',
    bg: '#EEF2FF',
    title: 'Order updates',
    description: "Know the instant your canteen order is ready to pick up.",
  },
  {
    id: 'alerts',
    Icon: Megaphone,
    color: '#059669',
    bg: '#ECFDF5',
    title: 'Campus alerts',
    description: "Never miss an official notice, exam schedule, or event.",
  },
  {
    id: 'social',
    Icon: MessageCircle,
    color: '#7C3AED',
    bg: '#F5F3FF',
    title: 'Social activity',
    description: "Get notified when someone follows you or likes your diary.",
  },
  {
    id: 'diaries',
    Icon: BookOpen,
    color: '#D97706',
    bg: '#FFFBEB',
    title: 'Diary interactions',
    description: "Stay in the loop when classmates engage with your posts.",
  },
] as const;

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * PushOnboardingModal
 *
 * A premium, light-mode-only bottom-sheet (mobile) / centered dialog (desktop)
 * that explains push notifications to the user before requesting permission.
 *
 * Rules:
 * - Only shown once per install (localStorage flag), unless forcibly shown
 * - Never shown on auth/landing pages
 * - Only triggers Notification.requestPermission() when user clicks CTA
 * - Strictly light-mode — no dark: classes anywhere
 */
export const PushOnboardingModal: React.FC = () => {
  const profile = useAuthStore((s) => s.profile);
  const userId = profile?.id ?? null;

  const { shouldShowPrompt, isLoading, subscribe, dismiss } = usePushNotifications(userId);

  const [mounted, setMounted] = useState(false);
  const [sheetVisible, setSheetVisible] = useState(false);
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState(true);
  const [bellRing, setBellRing] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Determine whether this user has already seen the onboarding
  useEffect(() => {
    const seen = Boolean(localStorage.getItem(ONBOARDING_SHOWN_KEY));
    setHasSeenOnboarding(seen);
  }, []);

  // Bell ring animation cycle
  useEffect(() => {
    if (!mounted) return;
    const interval = setInterval(() => {
      setBellRing(true);
      setTimeout(() => setBellRing(false), 600);
    }, 3000);
    return () => clearInterval(interval);
  }, [mounted]);

  // Show the modal after a delay if conditions are met
  useEffect(() => {
    if (!userId || !shouldShowPrompt || hasSeenOnboarding) return;

    const isPublicPage = /^\/(login|register|reset-password|terms|privacy|about|contact|account-restricted)/.test(
      window.location.pathname
    );
    if (isPublicPage) return;

    timerRef.current = setTimeout(() => {
      setMounted(true);
      // Animate in slightly after mount
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setSheetVisible(true));
      });
    }, ONBOARDING_DELAY_MS);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [userId, shouldShowPrompt, hasSeenOnboarding]);

  const close = (dismissed: boolean) => {
    setSheetVisible(false);
    setTimeout(() => setMounted(false), 350);
    localStorage.setItem(ONBOARDING_SHOWN_KEY, '1');
    if (dismissed) dismiss();
  };

  const handleEnable = async () => {
    localStorage.setItem(ONBOARDING_SHOWN_KEY, '1');
    const success = await subscribe();
    if (success) {
      toast.success('Notifications enabled! 🔔', { duration: 3000 });
      close(false);
    } else {
      // Permission was denied by the OS dialog or an error occurred
      if (typeof window !== 'undefined' && Notification.permission === 'denied') {
        toast.error('Blocked in browser settings — please allow notifications there.', {
          duration: 5000,
        });
      } else {
        toast.error('Could not enable notifications right now. Try again later.');
      }
      close(true);
    }
  };

  const handleNotNow = () => close(true);

  if (!mounted) return null;

  return (
    /* ── Backdrop ─────────────────────────────────────────────────────────── */
    <div
      className="fixed inset-0 z-[135] flex items-end justify-center sm:items-center sm:p-4"
      style={{
        backgroundColor: sheetVisible ? 'rgba(0,0,0,0.35)' : 'rgba(0,0,0,0)',
        backdropFilter: sheetVisible ? 'blur(3px)' : 'none',
        transition: 'background-color 0.3s ease, backdrop-filter 0.3s ease',
      }}
      onClick={() => handleNotNow()}
      role="dialog"
      aria-modal="true"
      aria-label="Enable push notifications"
    >
      {/* ── Sheet / Dialog ─────────────────────────────────────────────────── */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-md"
        style={{
          transform: sheetVisible ? 'translateY(0)' : 'translateY(100%)',
          transition: 'transform 0.35s cubic-bezier(0.32, 0.72, 0, 1)',
        }}
      >
        <div
          className="relative rounded-t-[28px] sm:rounded-2xl bg-white overflow-hidden"
          style={{
            paddingBottom: 'max(env(safe-area-inset-bottom), 24px)',
            boxShadow: '0 -4px 60px rgba(0, 0, 0, 0.08), 0 -1px 0 rgba(0,0,0,0.04)',
          }}
        >
          {/* Drag handle (mobile only) */}
          <div className="flex justify-center pt-3 pb-0 sm:hidden">
            <div className="h-1 w-10 rounded-full bg-black/10" />
          </div>

          {/* Close button */}
          <button
            onClick={handleNotNow}
            className="absolute top-4 right-4 flex h-8 w-8 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="px-6 pt-5 pb-2">
            {/* ── Hero icon ─────────────────────────────────────────────── */}
            <div className="flex justify-center mb-5">
              <div className="relative">
                {/* Outer pulse ring */}
                <div
                  className="absolute inset-0 rounded-full"
                  style={{
                    background: 'radial-gradient(circle, rgba(45,78,245,0.12) 0%, transparent 70%)',
                    animation: 'push-pulse 2.4s ease-in-out infinite',
                    transform: 'scale(1.8)',
                  }}
                />
                {/* Icon container */}
                <div
                  className="relative flex h-16 w-16 items-center justify-center rounded-2xl"
                  style={{
                    background: 'linear-gradient(135deg, #EEF2FF 0%, #E0E7FF 100%)',
                    boxShadow: '0 4px 20px rgba(45,78,245,0.15)',
                  }}
                >
                  {bellRing ? (
                    <BellRing className="h-8 w-8 text-[#2D4EF5]" style={{ animation: 'bell-shake 0.5s ease' }} />
                  ) : (
                    <Bell className="h-8 w-8 text-[#2D4EF5]" />
                  )}
                </div>
              </div>
            </div>

            {/* ── Headline ──────────────────────────────────────────────── */}
            <div className="text-center mb-1">
              <h2 className="text-[20px] font-extrabold tracking-tight text-gray-900 leading-tight">
                Stay connected to campus
              </h2>
              <p className="mt-1.5 text-[13.5px] text-gray-500 leading-relaxed max-w-xs mx-auto">
                Allow notifications so Campus Blink can keep you in the loop — even when the app is closed.
              </p>
            </div>

            {/* ── Divider ───────────────────────────────────────────────── */}
            <div className="my-5 h-px bg-gray-100" />

            {/* ── Benefits ──────────────────────────────────────────────── */}
            <ul className="space-y-3 mb-5">
              {BENEFITS.map(({ id, Icon, color, bg, title, description }) => (
                <li key={id} className="flex items-start gap-3">
                  <div
                    className="flex-shrink-0 mt-0.5 h-9 w-9 rounded-xl flex items-center justify-center"
                    style={{ background: bg }}
                  >
                    <Icon className="h-4.5 w-4.5" style={{ color }} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold text-gray-900 leading-snug">{title}</p>
                    <p className="text-[12px] text-gray-500 leading-relaxed">{description}</p>
                  </div>
                </li>
              ))}
            </ul>

            {/* ── CTAs ──────────────────────────────────────────────────── */}
            <div className="flex flex-col gap-2.5 pb-1">
              <button
                id="push-onboarding-enable-btn"
                onClick={handleEnable}
                disabled={isLoading}
                className="w-full rounded-2xl py-4 text-[15px] font-extrabold text-white transition-all active:scale-[0.97] disabled:opacity-60"
                style={{
                  background: 'linear-gradient(135deg, #2D4EF5 0%, #6366f1 100%)',
                  boxShadow: '0 4px 20px rgba(45, 78, 245, 0.30)',
                }}
              >
                {isLoading ? 'Enabling…' : 'Enable Notifications'}
              </button>

              <button
                id="push-onboarding-dismiss-btn"
                onClick={handleNotNow}
                className="w-full rounded-2xl py-3.5 text-[14px] font-semibold text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-700"
                style={{ border: '1.5px solid #E5E7EB' }}
              >
                Not now
              </button>
            </div>

            {/* ── Privacy note ──────────────────────────────────────────── */}
            <p className="text-center text-[11px] text-gray-400 mt-3 leading-relaxed">
              You can change this anytime in{' '}
              <span className="font-medium text-gray-500">Settings → Notifications</span>.
              We never send spam.
            </p>
          </div>
        </div>
      </div>

      {/* ── Keyframes injected inline ──────────────────────────────────────── */}
      <style>{`
        @keyframes push-pulse {
          0%, 100% { opacity: 0.6; transform: scale(1.8); }
          50%       { opacity: 1;   transform: scale(2.2); }
        }
        @keyframes bell-shake {
          0%  { transform: rotate(0deg);  }
          20% { transform: rotate(-18deg); }
          40% { transform: rotate(18deg); }
          60% { transform: rotate(-10deg); }
          80% { transform: rotate(10deg); }
          100%{ transform: rotate(0deg);  }
        }
      `}</style>
    </div>
  );
};
