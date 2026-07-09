import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import { ThemeAwareLogo } from './ThemeAwareLogo';

const VERIFY_EMAIL_KEY = 'cb_pending_verification_email';

export const AuthCallbackPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const user = useAuthStore((state) => state.user);
  const [state, setState] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const finalize = async () => {
      const query = new URLSearchParams(location.search);
      const tokenHash = query.get('token_hash');
      const type = (query.get('type') as 'signup' | 'recovery' | 'magiclink' | 'invite' | 'email_change') || 'signup';

      if (!tokenHash) {
        // No token — possibly a stale or malformed link. Redirect to login.
        navigate('/login', { replace: true });
        return;
      }

      const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });

      if (error) {
        const msg = String(error?.message || '').toLowerCase();
        if (msg.includes('expired') || msg.includes('invalid')) {
          setErrorMessage('This verification link has expired or was already used. Please request a new one from the sign-in page.');
        } else {
          setErrorMessage('Something went wrong verifying your email. Try clicking the link again or request a new one.');
        }
        setState('error');
        return;
      }

      if (type === 'recovery') {
        // Password reset flow — go to login so they can set new password
        navigate('/login', { replace: true });
        return;
      }

      // Email verified — clear pending email key so login doesn't re-show post-signup screen
      localStorage.removeItem(VERIFY_EMAIL_KEY);
      setState('success');

      setTimeout(() => {
        navigate('/login?verified=1', { replace: true });
      }, 2000);
    };

    finalize();
  }, []);

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] flex flex-col items-center justify-center gap-8 text-[var(--text-primary)] font-sans px-6">
      <Link to={user ? '/student/home' : '/'} className="no-underline cursor-pointer">
        <ThemeAwareLogo alt="Campus Blink" loading="eager" className="h-[64px] w-auto object-contain opacity-90" />
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
          <CheckCircle className="w-12 h-12 text-[#16A34A]" />
          <p className="text-2xl font-bold">Email verified!</p>
          <p className="text-sm text-[var(--text-secondary)]">Taking you to login…</p>
        </div>
      )}

      {state === 'error' && (
        <div className="flex flex-col items-center gap-4 text-center max-w-md">
          <XCircle className="w-12 h-12 text-[#DC2626]" />
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
