import React, { useEffect } from 'react';
import { RouterProvider } from 'react-router';
import { router } from './routes';
import { supabase } from '../lib/supabase';
import { getProfile } from '../api/auth';
import { useAuthStore } from '../store/authStore';
import { PWALayer } from './components/PWALayer';
import { Toaster } from 'react-hot-toast';

const ADMIN_OWNER_EMAIL = 'contactus.mayank@gmail.com';

function App() {
  const setAuth = useAuthStore((state) => state.setAuth);
  const setIsLoading = useAuthStore((state) => state.setIsLoading);

  useEffect(() => {
    let mounted = true;

    const syncSession = async (session) => {
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
      const isAdminOwner = String(user?.email || '').toLowerCase() === ADMIN_OWNER_EMAIL;

      if (isAdminOwner && (normalizedStatus === 'restricted' || normalizedStatus === 'banned')) {
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
        setAuth(user, resolvedProfile ? { ...resolvedProfile, email: resolvedProfile.email || user.email } : { id: user.id, email: user.email, role: 'student' });
        setIsLoading(false);
      }
    };

    supabase.auth.getSession().then(({ data }) => {
      syncSession(data.session);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      syncSession(session);
    });

    return () => {
      mounted = false;
      authListener.subscription.unsubscribe();
    };
  }, [setAuth, setIsLoading]);

  return (
    <>
      <RouterProvider router={router} />
      <Toaster position="top-right" toastOptions={{ duration: 3500 }} />
      <PWALayer />
    </>
  );
}

export default App;
