import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router';
import { Lock, Eye, EyeOff, CheckCircle, AlertCircle, ArrowLeft, KeyRound, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { ThemeAwareLogo } from './ThemeAwareLogo';
import toast from 'react-hot-toast';

export const ResetPasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [isVerifyingToken, setIsVerifyingToken] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    let mounted = true;

    const verifySessionOrToken = async () => {
      setError(null);
      const query = new URLSearchParams(location.search);
      const tokenHash = query.get('token_hash');
      const type = query.get('type');

      // If token_hash is in query params, verify OTP first
      if (tokenHash && type === 'recovery') {
        const { error: otpError } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: 'recovery',
        });
        if (otpError) {
          if (mounted) {
            setError('This password reset link has expired or is invalid. Please request a new link.');
            setIsVerifyingToken(false);
          }
          return;
        }
      }

      // Check if there is an active session or recovery session
      const { data: { session } } = await supabase.auth.getSession();
      if (mounted) {
        setIsVerifyingToken(false);
      }
    };

    verifySessionOrToken();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') {
        if (mounted) {
          setError(null);
          setIsVerifyingToken(false);
        }
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [location.search]);

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match. Please ensure both fields are identical.');
      return;
    }

    setIsLoading(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) {
        setError(updateError.message || 'Failed to reset password. Please try again.');
        setIsLoading(false);
        return;
      }

      setIsSuccess(true);
      toast.success('Password updated successfully!');

      // Sign out so they can log in freshly with the new password
      await supabase.auth.signOut();

      setTimeout(() => {
        navigate('/login?reset=success', { replace: true });
      }, 2500);
    } catch (err: any) {
      setError(err?.message || 'An unexpected error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans text-[var(--text-primary)]">
      <div className="sm:mx-auto sm:w-full sm:max-w-md px-4">
        <Link to="/" className="flex justify-center mb-6 no-underline">
          <ThemeAwareLogo alt="Campus Blink" className="h-16 w-auto object-contain" />
        </Link>
      </div>

      <div className="mt-2 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="bg-[var(--bg-secondary)] py-8 px-6 shadow-xl rounded-2xl border border-[var(--border)] sm:px-10 relative overflow-hidden">
          {isVerifyingToken ? (
            <div className="py-12 flex flex-col items-center justify-center text-center gap-4">
              <Loader2 className="w-10 h-10 animate-spin text-[var(--yellow)]" />
              <p className="font-syne font-bold text-lg">Verifying reset link...</p>
              <p className="text-sm text-[var(--text-secondary)]">Please wait while we validate your security token.</p>
            </div>
          ) : isSuccess ? (
            <div className="py-8 flex flex-col items-center text-center gap-5">
              <div className="w-16 h-16 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center text-green-500">
                <CheckCircle className="w-10 h-10" />
              </div>
              <div>
                <h3 className="font-syne text-2xl font-bold text-[var(--text-primary)]">Password Changed!</h3>
                <p className="text-sm text-[var(--text-secondary)] mt-2 leading-relaxed">
                  Your password has been successfully updated. Redirecting you to the sign-in page...
                </p>
              </div>
              <Link
                to="/login"
                className="mt-2 w-full inline-flex items-center justify-center py-3 px-4 rounded-xl bg-[var(--yellow)] text-[var(--text-primary)] font-bold text-sm shadow-md hover:opacity-90 transition-all no-underline"
              >
                Go to Sign In
              </Link>
            </div>
          ) : (
            <>
              <div className="text-center mb-6">
                <div className="mx-auto w-12 h-12 rounded-xl bg-[var(--yellow)]/15 border border-[var(--yellow)]/30 flex items-center justify-center text-[var(--yellow)] mb-3">
                  <KeyRound className="w-6 h-6" />
                </div>
                <h2 className="font-syne text-2xl font-extrabold text-[var(--text-primary)]">
                  Create New Password
                </h2>
                <p className="mt-1 text-sm text-[var(--text-secondary)]">
                  Enter and confirm your new password below.
                </p>
              </div>

              {error && (
                <div className="mb-6 rounded-xl border border-[var(--error)]/30 bg-[var(--error)]/10 p-4 flex items-start gap-3 text-sm text-[var(--error)]">
                  <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-semibold">Unable to Reset Password</p>
                    <p className="mt-0.5 text-xs opacity-90">{error}</p>
                  </div>
                </div>
              )}

              <form onSubmit={handleResetSubmit} className="space-y-5">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-1.5">
                    New Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[var(--text-muted)]">
                      <Lock className="h-4 w-4" />
                    </div>
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="At least 6 characters"
                      className="block w-full pl-10 pr-10 py-3 rounded-xl bg-[var(--bg-primary)] border border-[var(--border)] text-[var(--text-primary)] placeholder-[var(--text-muted)] text-sm focus:outline-none focus:border-[var(--yellow)] focus:ring-1 focus:ring-[var(--yellow)] transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                    >
                      {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-1.5">
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[var(--text-muted)]">
                      <Lock className="h-4 w-4" />
                    </div>
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter your new password"
                      className="block w-full pl-10 pr-10 py-3 rounded-xl bg-[var(--bg-primary)] border border-[var(--border)] text-[var(--text-primary)] placeholder-[var(--text-muted)] text-sm focus:outline-none focus:border-[var(--yellow)] focus:ring-1 focus:ring-[var(--yellow)] transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3.5 px-4 rounded-xl bg-[var(--yellow)] text-[var(--text-primary)] font-syne font-bold text-sm shadow-lg hover:opacity-95 active:scale-[0.99] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Updating Password...
                    </>
                  ) : (
                    'Update Password'
                  )}
                </button>
              </form>

              <div className="mt-6 pt-6 border-t border-[var(--border)] text-center">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-[var(--text-secondary)] hover:text-[var(--yellow)] transition-colors no-underline"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Back to Sign In
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
