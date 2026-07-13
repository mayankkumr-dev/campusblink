import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import { Logo } from '../../app/components/ui/Logo';

const VERIFY_EMAIL_KEY = 'cb_pending_verification_email';

export const AuthCallbackPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const user = useAuthStore((state) => state.user);
  const [state, setState] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    let mounted = true;

    const finalize = async () => {
      try {
        const query = new URLSearchParams(location.search);
        const tokenHash = query.get('token_hash');
        const code = query.get('code');
        const type = (query.get('type') as 'signup' | 'recovery' | 'magiclink' | 'invite' | 'email_change') || 'signup';

        // Check if there is an error in the URL (e.g. ?error=access_denied&error_description=...)
        const errorDescription = query.get('error_description');
        if (errorDescription) {
          if (mounted) {
            setErrorMessage(errorDescription);
            setState('error');
          }
          return;
        }

        // If a PKCE code is provided, exchange it for a session
        if (code) {
          try {
            const { error } = await supabase.auth.exchangeCodeForSession(code);
            if (error) throw error;
          } catch (err: any) {
            // Supabase JS client v2 automatically handles PKCE code exchange on page load.
            // If the code was already consumed by the client, it will throw an 'Invalid Auth Code' error.
            // Check if we already have a session.
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
              throw err;
            }
          }
        } 
        // If a token_hash is provided, verify the OTP directly
        else if (tokenHash) {
          const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
          if (error) throw error;
        }
        // If there's an access_token in the URL hash, Supabase client automatically handles it.
        // We just need to check if we now have a session.
        else if (location.hash.includes('access_token')) {
          // Wait briefly for Supabase to parse the hash and set the session
          await new Promise(resolve => setTimeout(resolve, 500));
          const { data: { session }, error } = await supabase.auth.getSession();
          if (error || !session) {
            throw new Error('Failed to extract session from URL.');
          }
        } 
        else {
          // No token, no code, no hash — invalid callback URL.
          if (mounted) navigate('/login', { replace: true });
          return;
        }

        if (type === 'recovery') {
          // Password reset flow — redirect to reset-password page to set new password
          if (mounted) navigate('/reset-password', { replace: true });
          return;
        }

        // Email verified — clear pending email key so login doesn't re-show post-signup screen
        localStorage.removeItem(VERIFY_EMAIL_KEY);
        if (mounted) {
          setState('success');
          setTimeout(() => {
            if (mounted) navigate('/login?verified=1', { replace: true });
          }, 2000);
        }
      } catch (err: any) {
        if (!mounted) return;
        const msg = String(err?.message || '').toLowerCase();
        if (msg.includes('expired') || msg.includes('invalid') || msg.includes('flow state not found')) {
          setErrorMessage('This verification link has expired or was already used. Please request a new one from the sign-in page.');
        } else {
          setErrorMessage('Something went wrong verifying your email. Try clicking the link again or request a new one.');
        }
        setState('error');
      }
    };

    finalize();
    return () => { mounted = false; };
  }, [location.search, location.hash, navigate]);

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] flex flex-col items-center justify-center gap-8 text-[var(--text-primary)] font-sans px-6">
      <Link to={user ? '/student/home' : '/'} className="no-underline cursor-pointer">
        <Logo alt="Campus Blink" loading="eager" className="h-[64px] w-auto object-contain opacity-90" />
      </Link>

      {state === 'loading' && (
        <div className="flex flex-col items-center gap-4 text-center">
          <Loader2 className="w-10 h-10 animate-spin text-[var(--text-primary)]" />
          <p className="text-lg font-semibold">Verifying your email…</p>
          <p className="text-sm text-[var(--text-secondary)]">This only takes a moment.</p>
        </div>
      )}

      {state === 'success' && (
        <div className="flex flex-col items-center gap-4 text-center">
          <CheckCircle className="w-12 h-12 text-accent-green" />
          <p className="text-2xl font-bold">Email verified!</p>
          <p className="text-sm text-[var(--text-secondary)]">Taking you to login…</p>
        </div>
      )}

      {state === 'error' && (
        <div className="flex flex-col items-center gap-4 text-center max-w-md">
          <XCircle className="w-12 h-12 text-[#DC2626] dark:text-red-400 transition-colors" />
          <p className="text-2xl font-bold">Verification failed</p>
          <p className="text-sm text-[var(--text-secondary)]">{errorMessage}</p>
          <button
            onClick={() => navigate('/login', { replace: true })}
            className="mt-2 rounded-full bg-[var(--text-primary)] px-8 py-3 text-sm font-bold text-white hover:bg-[var(--yellow)] hover:text-[var(--text-primary)] transition-colors"
          >
            Back to Login
          </button>
        </div>
      )}
    </div>
  );
};
