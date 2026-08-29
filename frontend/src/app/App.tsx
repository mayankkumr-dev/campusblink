import React, { useEffect } from 'react';
import { RouterProvider } from 'react-router';
import { router } from './routes';
import '../bones/registry';
import { supabase, setClerkToken } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { useThemeStore } from '../store/themeStore';
import { PWALayer } from './components/PWALayer';
import { PushOnboardingModal } from './components/PushOnboardingModal';
import toast, { Toaster } from 'react-hot-toast';
import { OfflineBanner } from './components/OfflineBanner';
import { useThemeColor } from '../hooks/useThemeColor';
import { onForegroundMessage } from '../lib/firebase';
import { useUser, useSession } from '@clerk/clerk-react';

const ADMIN_EMAIL = (import.meta.env.VITE_ADMIN_EMAIL || 'contactus.mayank@gmail.com').toLowerCase();

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// ---------------------------------------------------------------------------
// Sync Clerk user → Supabase profile → authStore
// ---------------------------------------------------------------------------
async function syncClerkUserToStore(
  clerkUser: ReturnType<typeof useUser>['user'],
  clerkSession: any,
  setAuth: (u: any, p: any) => void,
  setIsLoading: (v: boolean) => void
) {
  try {
    if (!clerkUser) {
      setClerkToken(null);
      setAuth(null, null);
      return;
    }

    // Await token before fetching profile to bypass RLS errors
    if (clerkSession) {
      try {
        const token = await clerkSession.getToken({ template: 'supabase' });
        setClerkToken(token);
      } catch {
        try {
          const token = await clerkSession.getToken();
          setClerkToken(token);
        } catch {
          setClerkToken(null);
        }
      }
    }

    const primaryEmail = clerkUser.primaryEmailAddress?.emailAddress || '';

    // Fetch profile by clerk_user_id (fast path)
    let { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('clerk_user_id', clerkUser.id)
      .maybeSingle();

    if (!profile) {
      // Safe Auto-heal: If the profile is missing, it's EITHER a new user waiting for the webhook,
      // OR a ghost account that was deleted from the DB.
      // We check if the Clerk account was created more than 2 minutes ago.
      // If it's older than 2 minutes and has no DB profile, the webhook failed or it's a ghost account.
      const createdAt = clerkUser.createdAt ? new Date(clerkUser.createdAt).getTime() : 0;
      const isOlderThanTwoMinutes = Date.now() - createdAt > 2 * 60 * 1000;
      
      if (isOlderThanTwoMinutes && typeof window !== 'undefined' && (window as any).Clerk) {
        console.warn('Ghost session detected (account > 2 mins old with no DB profile). Forcing sign out.');
        try {
          await clerkUser.delete();
          console.log('Ghost Clerk account deleted successfully (frontend).');
        } catch (e) {
          console.warn('Frontend delete failed, attempting backend heal-ghost:', e);
          try {
            const token = await clerkSession.getToken({ template: 'supabase' }) || await clerkSession.getToken();
            await fetch('/api/auth/heal-ghost', {
              method: 'POST',
              headers: { 'Authorization': `Bearer ${token}` }
            });
            console.log('Ghost Clerk account deleted successfully (backend).');
          } catch (err) {
            console.error('Backend heal-ghost failed:', err);
          }
        }
        await (window as any).Clerk.signOut();
        setClerkToken(null);
        setAuth(null, null);
        toast.error('Your account was previously deleted. Please sign up again to restore access.', { duration: 5000 });
        return;
      }
    }

    // If the profile was found but lacks clerk_user_id, back-fill it
    if (profile && !profile.clerk_user_id) {
      await supabase
        .from('profiles')
        .update({ clerk_user_id: clerkUser.id })
        .eq('id', profile.id);
      profile = { ...profile, clerk_user_id: clerkUser.id };
    }

    // Guard: if account is restricted/banned, sign out immediately
    const normalizedStatus = String(profile?.status || 'active').toLowerCase();
    if (normalizedStatus === 'restricted' || normalizedStatus === 'banned') {
      setAuth(null, null);
      if (window.location.pathname !== '/account-restricted') {
        const params = new URLSearchParams({ status: normalizedStatus });
        if (profile?.ban_reason) params.set('reason', profile.ban_reason);
        if (primaryEmail) params.set('email', primaryEmail);
        window.location.replace(`/account-restricted?${params.toString()}`);
      }
      return;
    }

    // Hydrate store — pass Clerk user object as `user`, Supabase profile as `profile`
    setAuth(clerkUser, profile ? { ...profile, email: profile.email || primaryEmail } : null);
  } catch (err) {
    console.error('syncClerkUserToStore error:', err);
  } finally {
    setIsLoading(false);
  }
}

// ---------------------------------------------------------------------------
// App root component
// ---------------------------------------------------------------------------
function App() {
  const setAuth = useAuthStore((state) => state.setAuth);
  const setIsLoading = useAuthStore((state) => state.setIsLoading);
  const initTheme = useThemeStore((state) => state.initTheme);

  // Clerk hooks
  const { user: clerkUser, isLoaded: isUserLoaded } = useUser();
  const { session: clerkSession } = useSession();

  useThemeColor();

  useEffect(() => {
    initTheme();
  }, [initTheme]);

  // ── Clerk session → Supabase JWT bridge ──────────────────────────────────
  // Whenever the Clerk session changes, refresh the Clerk JWT and inject it
  // into the Supabase client so all DB requests are authenticated.
  useEffect(() => {
    if (!clerkSession) {
      setClerkToken(null);
      return;
    }

    let cancelled = false;

    async function refreshToken() {
      try {
        // 'supabase' is the name of your Clerk JWT Template (set in Clerk Dashboard)
        const token = await clerkSession.getToken({ template: 'supabase' });
        const standardToken = await clerkSession.getToken();
        if (!cancelled) setClerkToken(token, standardToken);
      } catch {
        // Template not yet configured — fall back to default Clerk JWT
        try {
          const token = await clerkSession.getToken();
          if (!cancelled) setClerkToken(token, token);
        } catch {
          if (!cancelled) setClerkToken(null, null);
        }
      }
    }

    refreshToken();

    // Refresh the token every 50 seconds (Clerk JWTs expire in 60s by default)
    const interval = setInterval(refreshToken, 50_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [clerkSession]);

  // ── Clerk user → authStore sync ──────────────────────────────────────────
  useEffect(() => {
    if (!isUserLoaded) return;
    syncClerkUserToStore(clerkUser, clerkSession, setAuth, setIsLoading);
  }, [clerkUser, clerkSession, isUserLoaded, setAuth, setIsLoading]);

  // ── FCM foreground message handler ───────────────────────────────────────
  useEffect(() => {
    let unsubscribe: (() => void) | null = null;

    onForegroundMessage((payload: any) => {
      const title =
        payload?.notification?.title ||
        payload?.data?.title ||
        'Campus Blink 🔔';
      const body =
        payload?.notification?.body ||
        payload?.data?.body ||
        'You have a new update.';
      const url = payload?.data?.url || payload?.fcmOptions?.link || null;

      toast(
        (t) => (
          <div
            className="flex items-start gap-3 cursor-pointer"
            onClick={() => {
              if (url) window.location.href = url;
              toast.dismiss(t.id);
            }}
          >
            <img
              src="/logo2/Blue_transparent.png"
              alt=""
              className="w-8 h-8 rounded-lg object-contain flex-shrink-0"
              onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
            />
            <div className="min-w-0">
              <p className="text-[13px] font-semibold text-gray-900 leading-snug">{title}</p>
              <p className="text-[12px] text-gray-500 mt-0.5 leading-snug">{body}</p>
            </div>
          </div>
        ),
        {
          duration: 5000,
          style: {
            background: '#fff',
            border: '1px solid #e5e7eb',
            borderRadius: '12px',
            padding: '12px',
            maxWidth: '360px',
          },
        }
      );
    }).then((unsub) => {
      if (typeof unsub === 'function') unsubscribe = unsub;
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  // ── Service Worker → React navigation bridge ─────────────────────────────
  // When the user taps a push notification while the app window is already
  // open, firebase-messaging-sw.js posts NOTIFICATION_NAVIGATE instead of
  // calling WindowClient.navigate() (which is unreliable on iOS Safari).
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    const onSWMessage = (event: MessageEvent) => {
      if (event.data?.type === 'NOTIFICATION_NAVIGATE' && event.data?.url) {
        try {
          const targetUrl = new URL(event.data.url);
          // Only navigate for same-origin URLs
          if (targetUrl.origin === window.location.origin) {
            router.navigate(targetUrl.pathname + targetUrl.search + targetUrl.hash);
          }
        } catch {
          // Invalid URL — ignore
        }
      }
    };

    navigator.serviceWorker.addEventListener('message', onSWMessage);
    return () => navigator.serviceWorker.removeEventListener('message', onSWMessage);
  }, []);

  useEffect(() => {
    const handleContextMenu = (event: MouseEvent) => {
      event.preventDefault();
    };
    window.addEventListener('contextmenu', handleContextMenu);
    return () => {
      window.removeEventListener('contextmenu', handleContextMenu);
    };
  }, []);

  return (
    <>
      <PushOnboardingModal />
      <RouterProvider router={router} />
      <Toaster position="bottom-center" toastOptions={{ duration: 3500 }} />
      <PWALayer />
      <OfflineBanner />
    </>
  );
}

export default App;
