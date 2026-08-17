import React, { useEffect } from 'react';
import { RouterProvider } from 'react-router';
import { router } from './routes';
import '../bones/registry';
import { supabase } from '../lib/supabase';
import { getProfile } from '../api/auth';
import { useAuthStore } from '../store/authStore';
import { useThemeStore } from '../store/themeStore';
import { PWALayer } from './components/PWALayer';
import { PushOnboardingModal } from './components/PushOnboardingModal';
import toast, { Toaster } from 'react-hot-toast';
import { OfflineBanner } from './components/OfflineBanner';
import { useThemeColor } from '../hooks/useThemeColor';
import { onForegroundMessage } from '../lib/firebase';
const DEFAULT_BANNER_IMAGE_URL = '/banner-background.png';
const ADMIN_EMAIL = (import.meta.env.VITE_ADMIN_EMAIL || 'contactus.mayank@gmail.com').toLowerCase();

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function buildProfileSeedFromMetadata(user: import('@supabase/supabase-js').User) {
  const metadata = user?.user_metadata || {};
  const name = String(metadata.full_name || metadata.name || '').trim() || null;
  const username = String(metadata.username || '').trim().toLowerCase() || null;
  const college = String(metadata.college_name || metadata.college || '').trim() || null;

  return {
    id: user.id,
    email: user.email,
    name,
    username,
    college,
    role: undefined,
    cover_url: metadata.cover_url || DEFAULT_BANNER_IMAGE_URL,
  };
}

function App() {
  const setAuth = useAuthStore((state) => state.setAuth);
  const setIsLoading = useAuthStore((state) => state.setIsLoading);
  const initTheme = useThemeStore((state) => state.initTheme);

  useThemeColor();

  useEffect(() => {
    initTheme();
  }, [initTheme]);

  // ── FCM foreground message handler ────────────────────────────────────────
  // When the app is open and a push notification arrives, FCM suppresses the
  // OS notification. We show an in-app toast instead so users never miss it.
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

  useEffect(() => {
    const handleContextMenu = (event: MouseEvent) => {
      event.preventDefault();
    };

    window.addEventListener('contextmenu', handleContextMenu);

    return () => {
      window.removeEventListener('contextmenu', handleContextMenu);
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    const syncSession = async (session: import('@supabase/supabase-js').Session | null) => {
      try {
        const user = session?.user || null;

        if (!user) {
          if (mounted) {
            setAuth(null, null);
          }
          return;
        }

        const { data: profile } = await getProfile(user.id);

        let resolvedProfile = profile;
        let normalizedStatus = String(profile?.status || 'active').toLowerCase();

        if (!resolvedProfile) {
          const seed = buildProfileSeedFromMetadata(user);

          // Ensure the profile row exists, then re-fetch from DB so UI uses real persisted values.
          await supabase
            .from('profiles')
            .upsert(seed, { onConflict: 'id' });

          for (let attempt = 0; attempt < 4 && !resolvedProfile; attempt += 1) {
            const { data: fetchedProfile } = await getProfile(user.id);
            if (fetchedProfile) {
              resolvedProfile = fetchedProfile;
              normalizedStatus = String(fetchedProfile.status || 'active').toLowerCase();
              break;
            }
            await wait(250);
          }
        }

        if (resolvedProfile?.role === 'admin' && (normalizedStatus === 'restricted' || normalizedStatus === 'banned')) {
          const { data: restoredProfile } = await supabase
            .from('profiles')
            .update({ status: 'active', ban_reason: null, banned_by: null, banned_at: null })
            .eq('id', user.id)
            .select('*')
            .single();

          if (restoredProfile) {
            resolvedProfile = restoredProfile;
            normalizedStatus = String(restoredProfile.status || 'active').toLowerCase();
          }
        }

        const isHistoricalPending = 
          user.user_metadata?.requested_role === 'teacher' && 
          String(user.user_metadata?.role_request_status || '').toLowerCase() === 'pending';

        if (isHistoricalPending && profile?.role !== 'professor') {
          await supabase.from('profiles').update({
            role: 'professor',
            professor_status: 'pending',
            staff_room_number: user.user_metadata.staff_room_number || null,
            requested_role: 'teacher',
            role_request_status: 'pending',
          }).eq('id', user.id);
          
          resolvedProfile = {
             ...resolvedProfile,
             role: 'professor',
             professor_status: 'pending',
             staff_room_number: user.user_metadata.staff_room_number || null,
          };
        } else if (isHistoricalPending && profile?.role === 'professor' && 
                   String(profile?.professor_status || '').toLowerCase() === 'approved') {
          supabase.auth.updateUser({
            data: {
              role_request_status: 'approved',
              requested_role: null,
            }
          }).catch(() => null);
        }

        if (normalizedStatus === 'restricted' || normalizedStatus === 'banned') {
          await supabase.auth.signOut();
          if (mounted) {
            setAuth(null, null);
          }

          if (typeof window !== 'undefined' && window.location.pathname !== '/account-restricted') {
            const params = new URLSearchParams({ status: normalizedStatus });
            if (profile?.ban_reason) params.set('reason', profile.ban_reason);
            if (user?.email) params.set('email', user.email);
            window.location.replace(`/account-restricted?${params.toString()}`);
          }
          return;
        }

        if (mounted) {
          setAuth(user, resolvedProfile ? { ...resolvedProfile, email: resolvedProfile.email || user.email } : null);
        }
      } catch (err) {
        console.error('syncSession error:', err);
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    if (typeof window !== 'undefined') {
      const hash = window.location.hash;
      const search = window.location.search;
      if (hash.includes('type=recovery') && window.location.pathname !== '/reset-password') {
        window.location.replace('/reset-password' + hash);
      } else if (search.includes('type=recovery') && window.location.pathname !== '/reset-password') {
        window.location.replace('/reset-password' + search);
      }
    }

    if (!supabase?.auth) {
      if (mounted) setIsLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data }) => {
      syncSession(data.session);
    }).catch((err) => {
      console.error('getSession error:', err);
      if (mounted) setIsLoading(false);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        if (typeof window !== 'undefined' && window.location.pathname !== '/reset-password') {
          window.location.replace('/reset-password' + window.location.hash);
        }
      }
      syncSession(session);
    });

    return () => {
      mounted = false;
      authListener?.subscription?.unsubscribe();
    };
  }, [setAuth, setIsLoading]);

  return (
    <>
      {/* Primary push onboarding — shown once, deferred 4.5 s after first login */}
      <PushOnboardingModal />
      <RouterProvider router={router} />
      <Toaster position="bottom-center" toastOptions={{ duration: 3500 }} />
      <PWALayer />
      <OfflineBanner />
    </>
  );
}

export default App;
