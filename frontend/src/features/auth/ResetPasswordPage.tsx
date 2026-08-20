/**
 * ResetPasswordPage.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Fully rewritten to use Clerk's useSignIn() flow exclusively.
 * All previous supabase.auth.verifyOtp / supabase.auth.updateUser calls removed.
 *
 * Flow:
 *  Clerk sends a password-reset email containing a deep-link to this page with
 *  the OTP code embedded in the URL as ?code=XXXXXX (Clerk's default redirect).
 *
 *  If ?code is present  → pre-fill & auto-verify the code, then show Step 2.
 *  If ?code is absent   → show Step 1 (user enters the code manually).
 *
 *  Step 1: Enter the 6-digit reset code
 *  Step 2: Set the new password → auto sign-in → redirect to /student/home
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router';
import {
  Lock,
  Eye,
  EyeOff,
  KeyRound,
  CheckCircle,
  Loader2,
  ArrowLeft,
} from 'lucide-react';
import { useSignIn } from '@clerk/clerk-react';
import { Logo } from '../../app/components/ui/Logo';

// ─── Inline Clerk error type guard ───────────────────────────────────────────
// isClerkError is not re-exported from this version of @clerk/clerk-react
function isClerkError(err: unknown): err is { errors: Array<{ longMessage?: string; message?: string }> } {
  return (
    typeof err === 'object' &&
    err !== null &&
    'errors' in err &&
    Array.isArray((err as any).errors)
  );
}

// ─── Design tokens (Apple iOS Native — DESIGN.md) ────────────────────────────
const BLUE = '#0066cc';
const BLUE_HOVER = '#0071e3';
const INK = '#1d1d1f';
const INK_MUTED = '#7a7a7a';
const BORDER = '#e0e0e0';

// ─── Micro-components ─────────────────────────────────────────────────────────

const ClerkError: React.FC<{ message: string | null }> = ({ message }) => {
  if (!message) return null;
  return (
    <p className="mt-2 text-sm text-red-500 leading-snug" role="alert">
      {message}
    </p>
  );
};

// ─── Main component ───────────────────────────────────────────────────────────

type Step = 'code' | 'password' | 'success';

export const ResetPasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isLoaded, signIn, setActive } = useSignIn();

  const [step, setStep] = useState<Step>('code');

  // Step 1 — code entry
  const [code, setCode] = useState('');
  const [codeLoading, setCodeLoading] = useState(false);
  const [codeError, setCodeError] = useState<string | null>(null);

  // Step 2 — new password
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [passLoading, setPassLoading] = useState(false);
  const [passError, setPassError] = useState<string | null>(null);

  // ── On mount: if Clerk embedded ?code= in the URL, auto-verify it ────────────
  useEffect(() => {
    if (!isLoaded) return;

    const params = new URLSearchParams(location.search);
    const urlCode = params.get('code') || params.get('token');
    if (urlCode) {
      setCode(urlCode);
      // Auto-attempt verification
      verifyCode(urlCode);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded]);

  // ── Step 1: Verify the OTP/code ───────────────────────────────────────────
  const verifyCode = async (codeToVerify: string) => {
    if (!isLoaded || !signIn) return;
    setCodeError(null);
    setCodeLoading(true);

    try {
      const result = await signIn.attemptFirstFactor({
        strategy: 'reset_password_email_code',
        code: codeToVerify.trim(),
      });

      if (result.status === 'needs_new_password') {
        setStep('password');
      } else {
        setCodeError(`Unexpected status: ${result.status}. Please request a new reset link.`);
      }
    } catch (err) {
      if (isClerkError(err)) {
        setCodeError(
          err.errors[0]?.longMessage ||
          err.errors[0]?.message ||
          'Invalid or expired code. Please request a new reset link.'
        );
      } else {
        setCodeError('Verification failed. Please try again.');
      }
    } finally {
      setCodeLoading(false);
    }
  };

  const handleCodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    verifyCode(code);
  };

  // ── Step 2: Set new password ──────────────────────────────────────────────
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoaded || !signIn) return;
    setPassError(null);

    if (newPassword.length < 8) {
      setPassError('Password must be at least 8 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPassError('Passwords do not match.');
      return;
    }

    setPassLoading(true);
    try {
      const result = await signIn.resetPassword({ password: newPassword });

      if (result.status === 'complete') {
        setStep('success');
        await setActive!({ session: result.createdSessionId });
        // Give the user a moment to see the success state, then redirect
        setTimeout(() => {
          navigate('/student/home', { replace: true });
        }, 1500);
      } else {
        setPassError(`Unexpected status: ${result.status}. Please contact support.`);
      }
    } catch (err) {
      if (isClerkError(err)) {
        setPassError(
          err.errors[0]?.longMessage ||
          err.errors[0]?.message ||
          'Failed to reset password. Please try again.'
        );
      } else {
        setPassError('An unexpected error occurred. Please try again.');
      }
    } finally {
      setPassLoading(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div
      className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4 py-12"
      style={{ fontFamily: 'SF Pro Text, system-ui, -apple-system, BlinkMacSystemFont, sans-serif' }}
    >
      {/* Logo */}
      <div className="mb-8">
        <Link to="/" className="no-underline block">
          <Logo alt="Campus Blink" className="h-12 w-auto object-contain mx-auto" />
        </Link>
      </div>

      {/* Card */}
      <div
        className="w-full max-w-[400px] bg-white/90 backdrop-blur-xl rounded-3xl shadow-sm border border-black/[0.06] px-8 py-10"
        style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.06)' }}
      >

        {/* ─── Step 1: Enter reset code ──────────────────────────────────────── */}
        {step === 'code' && (
          <form onSubmit={handleCodeSubmit} noValidate>
            <div className="flex justify-center mb-5">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: `${BLUE}1a` }}>
                <KeyRound className="w-7 h-7" style={{ color: BLUE }} />
              </div>
            </div>

            <h1
              className="text-center text-2xl font-semibold mb-1"
              style={{ color: INK, letterSpacing: '-0.374px' }}
            >
              Enter reset code
            </h1>
            <p className="text-center text-[15px] mb-7 leading-snug" style={{ color: INK_MUTED }}>
              Check your email for the 6-digit code we sent you.
            </p>

            <div className="mb-5">
              <label
                htmlFor="rp-code"
                className="block text-[13px] font-semibold mb-1.5"
                style={{ color: INK }}
              >
                Verification code
              </label>
              <input
                id="rp-code"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                autoFocus
                required
                value={code}
                onChange={(e) => { setCode(e.target.value.replace(/\D/g, '')); setCodeError(null); }}
                placeholder="123456"
                className="w-full h-11 rounded-xl border bg-white px-4 text-[15px] text-center font-semibold tracking-widest focus:outline-none transition-all"
                style={{ borderColor: BORDER, color: INK }}
              />
              <ClerkError message={codeError} />
            </div>

            <button
              type="submit"
              disabled={codeLoading || code.length < 6}
              className="w-full h-11 rounded-full text-white text-[15px] font-medium transition-all active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              style={{ background: BLUE }}
              onMouseEnter={(e) => { if (!codeLoading) (e.currentTarget as HTMLButtonElement).style.background = BLUE_HOVER; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = BLUE; }}
            >
              {codeLoading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Verifying...</>
              ) : (
                'Verify Code'
              )}
            </button>

            <div className="mt-5 text-center">
              <p className="text-[13px]" style={{ color: INK_MUTED }}>
                Don't have a code?{' '}
                <Link
                  to="/forgot-password"
                  className="no-underline font-medium"
                  style={{ color: BLUE }}
                >
                  Request one
                </Link>
              </p>
            </div>

            <div className="mt-4 text-center">
              <Link
                to="/login"
                className="inline-flex items-center gap-1.5 text-sm no-underline transition-opacity hover:opacity-70"
                style={{ color: BLUE }}
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Back to Sign In
              </Link>
            </div>
          </form>
        )}

        {/* ─── Step 2: Set new password ──────────────────────────────────────── */}
        {step === 'password' && (
          <form onSubmit={handlePasswordSubmit} noValidate>
            <div className="flex justify-center mb-5">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: `${BLUE}1a` }}>
                <Lock className="w-7 h-7" style={{ color: BLUE }} />
              </div>
            </div>

            <h1
              className="text-center text-2xl font-semibold mb-1"
              style={{ color: INK, letterSpacing: '-0.374px' }}
            >
              Create new password
            </h1>
            <p className="text-center text-[15px] mb-7 leading-snug" style={{ color: INK_MUTED }}>
              Your identity is verified. Set a new strong password.
            </p>

            {/* New password */}
            <div className="mb-4">
              <label
                htmlFor="rp-new-password"
                className="block text-[13px] font-semibold mb-1.5"
                style={{ color: INK }}
              >
                New password
              </label>
              <div className="relative">
                <input
                  id="rp-new-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  autoFocus
                  required
                  value={newPassword}
                  onChange={(e) => { setNewPassword(e.target.value); setPassError(null); }}
                  placeholder="At least 8 characters"
                  className="w-full h-11 rounded-xl border bg-white pl-4 pr-11 text-[15px] focus:outline-none transition-all"
                  style={{ borderColor: BORDER, color: INK }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center transition-colors"
                  style={{ color: INK_MUTED }}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Confirm password */}
            <div className="mb-5">
              <label
                htmlFor="rp-confirm-password"
                className="block text-[13px] font-semibold mb-1.5"
                style={{ color: INK }}
              >
                Confirm password
              </label>
              <div className="relative">
                <input
                  id="rp-confirm-password"
                  type={showConfirm ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  value={confirmPassword}
                  onChange={(e) => { setConfirmPassword(e.target.value); setPassError(null); }}
                  placeholder="Re-enter your password"
                  className="w-full h-11 rounded-xl border bg-white pl-4 pr-11 text-[15px] focus:outline-none transition-all"
                  style={{ borderColor: BORDER, color: INK }}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm((v) => !v)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center transition-colors"
                  style={{ color: INK_MUTED }}
                  aria-label={showConfirm ? 'Hide password' : 'Show password'}
                >
                  {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <ClerkError message={passError} />
            </div>

            <button
              type="submit"
              disabled={passLoading}
              className="w-full h-11 rounded-full text-white text-[15px] font-medium transition-all active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              style={{ background: BLUE }}
              onMouseEnter={(e) => { if (!passLoading) (e.currentTarget as HTMLButtonElement).style.background = BLUE_HOVER; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = BLUE; }}
            >
              {passLoading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Updating password...</>
              ) : (
                'Set New Password'
              )}
            </button>

            <div className="mt-6 text-center">
              <Link
                to="/login"
                className="inline-flex items-center gap-1.5 text-sm no-underline transition-opacity hover:opacity-70"
                style={{ color: BLUE }}
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Back to Sign In
              </Link>
            </div>
          </form>
        )}

        {/* ─── Success state ─────────────────────────────────────────────────── */}
        {step === 'success' && (
          <div className="flex flex-col items-center text-center py-4">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center mb-5"
              style={{ background: 'rgba(52,199,89,0.12)' }}
            >
              <CheckCircle className="w-9 h-9 text-green-500" />
            </div>
            <h2
              className="text-2xl font-semibold mb-2"
              style={{ color: INK, letterSpacing: '-0.374px' }}
            >
              Password updated!
            </h2>
            <p className="text-[15px] leading-snug mb-6" style={{ color: INK_MUTED }}>
              Your password has been successfully changed. Signing you in…
            </p>
            <Loader2 className="w-5 h-5 animate-spin" style={{ color: BLUE }} />
          </div>
        )}
      </div>

      {/* Footer link */}
      {step !== 'success' && (
        <p className="mt-6 text-[13px] text-center" style={{ color: INK_MUTED }}>
          Remember your password?{' '}
          <Link to="/login" className="no-underline font-medium" style={{ color: BLUE }}>
            Sign in
          </Link>
        </p>
      )}
    </div>
  );
};
