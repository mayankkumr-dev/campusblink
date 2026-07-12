import React, { useEffect } from 'react';
import { RouterProvider } from 'react-router';
import { router } from './routes';
import '../bones/registry';
import { supabase } from '../lib/supabase';
import { getProfile } from '../api/auth';
import { useAuthStore } from '../store/authStore';
import { useThemeStore } from '../store/themeStore';
import { PWALayer } from './components/PWALayer';
import { NotificationBanner } from './components/NotificationBanner';
import { Toaster } from 'react-hot-toast';
const DEFAULT_BANNER_IMAGE_URL = '/banner-background.png';

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function buildProfileSeedFromMetadata(user: import('@supabase/supabase-js').User) {
  const metadata = user?.user_metadata || {};
  const name = String(metadata.full_name || metadata.name || '').trim() || null;
  const username = String(metadata.username || '').trim().toLowerCase() || null;
  const college = String(metadata.college_name || metadata.college || '').trim() || null;

  const isMayankAdmin = user?.email?.toLowerCase() === 'contactus.mayank@gmail.com';
  return {
    id: user.id,
    email: user.email,
    name,
    username,
    college,
    role: isMayankAdmin ? 'admin' : undefined,
    cover_url: metadata.cover_url || DEFAULT_BANNER_IMAGE_URL,
  };
}

function App() {
  const setAuth = useAuthStore((state) => state.setAuth);
  const setIsLoading = useAuthStore((state) => state.setIsLoading);
  const initTheme = useThemeStore((state) => state.initTheme);

  useEffect(() => {
    initTheme();
  }, [initTheme]);

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
      const user = session?.user || null;

      if (!user) {
        if (mounted) {
          setAuth(null, null);
          setIsLoading(false);
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

      const isMayankAdmin = user.email?.toLowerCase() === 'contactus.mayank@gmail.com';
      if (isMayankAdmin) {
        if (!resolvedProfile || resolvedProfile.role !== 'admin') {
          await supabase.from('profiles').update({ role: 'admin' }).eq('id', user.id);
          resolvedProfile = resolvedProfile ? { ...resolvedProfile, role: 'admin' } : { id: user.id, email: user.email, role: 'admin' };
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

      // If they haven't been synced to the database yet, their role is still 'student'.
      // Only sync them if they are still essentially 'student' while requesting 'teacher'.
      if (isHistoricalPending && profile?.role !== 'professor') {
        await supabase.from('profiles').update({
          role: 'professor',
          professor_status: 'pending',
          staff_room_number: user.user_metadata.staff_room_number || null,
          requested_role: 'teacher',
          role_request_status: 'pending',
        }).eq('id', user.id);
        
        // Assume it succeeds for local state
        resolvedProfile = {
           ...resolvedProfile,
           role: 'professor',
           professor_status: 'pending',
           staff_room_number: user.user_metadata.staff_room_number || null,
        };
      } else if (isHistoricalPending && profile?.role === 'professor' && 
                 String(profile?.professor_status || '').toLowerCase() === 'approved') {
        // Professor was approved in DB but auth metadata still says pending — clear the stale metadata
        // so the misleading "pending" toast is never shown on future logins.
        supabase.auth.updateUser({
          data: {
            role_request_status: 'approved',
            requested_role: null,
          }
        }).catch(() => null);
      }


      // Let the Router handle redirects to /professor/pending and /professor/rejected.
      // We no longer sign them out.

      if (normalizedStatus === 'restricted' || normalizedStatus === 'banned') {
        await supabase.auth.signOut();
        if (mounted) {
          setAuth(null, null);
          setIsLoading(false);
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
        setIsLoading(false);
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

    supabase.auth.getSession().then(({ data }) => {
      syncSession(data.session);
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
      authListener.subscription.unsubscribe();
    };
  }, [setAuth, setIsLoading]);

  return (
    <>
      <NotificationBanner />
      <RouterProvider router={router} />
      <Toaster position="top-right" toastOptions={{ duration: 3500 }} />
      <PWALayer />
    </>
  );
}

export default App;
