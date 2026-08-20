import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router';
import { useSignIn } from '@clerk/clerk-react';
import { Mail, KeyRound, Lock, Eye, EyeOff, CheckCircle, ArrowLeft, Loader2 } from 'lucide-react';
import { Logo } from '../../app/components/ui/Logo';

// ─── Inline Clerk error type guard ───────────────────────────────────────────
// isClerkError is not exported from this version of @clerk/clerk-react;
// we replicate the check inline.
function isClerkError(err: unknown): err is { errors: Array<{ longMessage?: string; message?: string }> } {
  return (
    typeof err === 'object' &&
    err !== null &&
    'errors' in err &&
    Array.isArray((err as any).errors)
  );
}

// ─── Step type ───────────────────────────────────────────────────────────────
type Step = 'request' | 'verify' | 'set';

// ─── Sub-component: Error text ────────────────────────────────────────────────
const ClerkError: React.FC<{ message: string | null }> = ({ message }) => {
  if (!message) return null;
  return (
    <p className="mt-2 text-sm text-red-500 leading-snug" role="alert">
      {message}
    </p>
  );
};

// ─── Sub-component: Back link ─────────────────────────────────────────────────
const BackToLogin: React.FC = () => (
  <div className="mt-6 text-center">
    <Link
      to="/login"
      className="inline-flex items-center gap-1.5 text-sm text-[#0066cc] hover:opacity-80 transition-opacity no-underline"
    >
      <ArrowLeft className="w-3.5 h-3.5" />
      Back to Sign In
    </Link>
  </div>
);

// ─── Main Page ────────────────────────────────────────────────────────────────
export const ForgotPasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const { isLoaded, signIn, setActive } = useSignIn();

  // Step state
  const [step, setStep] = useState<Step>('request');

  // Step 1 — Request
  const [email, setEmail] = useState('');
  const [requestLoading, setRequestLoading] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);

  // Step 2 — Verify OTP
  const [code, setCode] = useState('');
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);

  // Step 3 — Set new password
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [setLoading, setSetLoading] = useState(false);
  const [setError, setSetError] = useState<string | null>(null);

  // ── Step 1: Send reset code ─────────────────────────────────────────────────
  const handleRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoaded || !signIn) return;
    setRequestError(null);
    setRequestLoading(true);

    try {
      await signIn.create({
        strategy: 'reset_password_email_code',
        identifier: email.trim(),
      });
      setStep('verify');
    } catch (err) {
      if (isClerkError(err)) {
        setRequestError(err.errors[0]?.longMessage || err.errors[0]?.message || 'Failed to send reset code.');
      } else {
        setRequestError('An unexpected error occurred. Please try again.');
      }
    } finally {
      setRequestLoading(false);
    }
  };

  // ── Step 2: Verify OTP ──────────────────────────────────────────────────────
  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoaded || !signIn) return;
    setVerifyError(null);
    setVerifyLoading(true);

    try {
      const result = await signIn.attemptFirstFactor({
        strategy: 'reset_password_email_code',
        code: code.trim(),
      });

      if (result.status === 'needs_new_password') {
        setStep('set');
      } else {
        setVerifyError(`Unexpected status: ${result.status}. Please try again.`);
      }
    } catch (err) {
      if (isClerkError(err)) {
        setVerifyError(err.errors[0]?.longMessage || err.errors[0]?.message || 'Invalid or expired code.');
      } else {
        setVerifyError('Verification failed. Please try again.');
      }
    } finally {
      setVerifyLoading(false);
    }
  };

  // ── Step 3: Set new password → auto sign-in ─────────────────────────────────
  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoaded || !signIn) return;
    setSetError(null);

    if (newPassword.length < 8) {
      setSetError('Password must be at least 8 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setSetError('Passwords do not match. Please check both fields.');
      return;
    }

    setSetLoading(true);

    try {
      const result = await signIn.resetPassword({ password: newPassword });

      if (result.status === 'complete') {
        await setActive!({ session: result.createdSessionId });
        navigate('/student/home', { replace: true });
      } else {
        setSetError(`Unexpected status: ${result.status}. Please contact support.`);
      }
    } catch (err) {
      if (isClerkError(err)) {
        setSetError(err.errors[0]?.longMessage || err.errors[0]?.message || 'Failed to reset password.');
      } else {
        setSetError('An unexpected error occurred. Please try again.');
      }
    } finally {
      setSetLoading(false);
    }
  };

  // ── Shared card wrapper ──────────────────────────────────────────────────────
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
        {/* ─── Step 1: Request ─────────────────────────────────────────────── */}
        {step === 'request' && (
          <form onSubmit={handleRequest} noValidate>
            {/* Icon */}
            <div className="flex justify-center mb-5">
              <div className="w-14 h-14 rounded-2xl bg-[#0066cc]/10 flex items-center justify-center">
                <Mail className="w-7 h-7 text-[#0066cc]" />
              </div>
            </div>

            <h1
              className="text-center text-2xl font-semibold text-[#1d1d1f] mb-1"
              style={{ letterSpacing: '-0.374px' }}
            >
              Forgot password?
            </h1>
            <p className="text-center text-[15px] text-[#7a7a7a] mb-7 leading-snug">
              Enter your email and we'll send a reset code.
            </p>

            {/* Email input */}
            <div className="mb-5">
              <label
                htmlFor="fp-email"
                className="block text-[13px] font-semibold text-[#1d1d1f] mb-1.5"
              >
                Email address
              </label>
              <input
                id="fp-email"
                type="email"
                autoComplete="email"
                autoFocus
                required
                value={email}
                onChange={(e) => { setEmail(e.target.value); setRequestError(null); }}
                placeholder="you@college.edu"
                className="w-full h-11 rounded-xl border border-[#e0e0e0] bg-white px-4 text-[15px] text-[#1d1d1f] placeholder-[#7a7a7a] focus:outline-none focus:ring-2 focus:ring-[#0066cc]/30 focus:border-[#0066cc] transition-all"
              />
              <ClerkError message={requestError} />
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={requestLoading}
              className="w-full h-11 rounded-full bg-[#0066cc] text-white text-[15px] font-medium transition-all hover:bg-[#0071e3] active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {requestLoading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Sending...</>
              ) : (
                'Send Reset Code'
              )}
            </button>

            <BackToLogin />
          </form>
        )}

        {/* ─── Step 2: Verify OTP ──────────────────────────────────────────── */}
        {step === 'verify' && (
          <form onSubmit={handleVerify} noValidate>
            {/* Icon */}
            <div className="flex justify-center mb-5">
              <div className="w-14 h-14 rounded-2xl bg-[#0066cc]/10 flex items-center justify-center">
                <KeyRound className="w-7 h-7 text-[#0066cc]" />
              </div>
            </div>

            <h1
              className="text-center text-2xl font-semibold text-[#1d1d1f] mb-1"
              style={{ letterSpacing: '-0.374px' }}
            >
              Check your email
            </h1>
            <p className="text-center text-[15px] text-[#7a7a7a] mb-7 leading-snug">
              We sent a 6-digit code to{' '}
              <span className="font-semibold text-[#1d1d1f]">{email}</span>.
            </p>

            {/* OTP input */}
            <div className="mb-5">
              <label
                htmlFor="fp-code"
                className="block text-[13px] font-semibold text-[#1d1d1f] mb-1.5"
              >
                Verification code
              </label>
              <input
                id="fp-code"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                autoFocus
                required
                value={code}
                onChange={(e) => { setCode(e.target.value.replace(/\D/g, '')); setVerifyError(null); }}
                placeholder="123456"
                className="w-full h-11 rounded-xl border border-[#e0e0e0] bg-white px-4 text-[15px] text-[#1d1d1f] placeholder-[#7a7a7a] tracking-widest focus:outline-none focus:ring-2 focus:ring-[#0066cc]/30 focus:border-[#0066cc] transition-all text-center font-semibold"
              />
              <ClerkError message={verifyError} />
            </div>

            {/* Resend link */}
            <p className="text-[13px] text-[#7a7a7a] text-center mb-5">
              Didn't receive it?{' '}
              <button
                type="button"
                onClick={() => { setStep('request'); setCode(''); setVerifyError(null); }}
                className="text-[#0066cc] hover:opacity-80 transition-opacity bg-transparent border-none p-0 cursor-pointer"
              >
                Resend code
              </button>
            </p>

            {/* Submit */}
            <button
              type="submit"
              disabled={verifyLoading || code.length < 6}
              className="w-full h-11 rounded-full bg-[#0066cc] text-white text-[15px] font-medium transition-all hover:bg-[#0071e3] active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {verifyLoading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Verifying...</>
              ) : (
                'Verify Code'
              )}
            </button>

            <BackToLogin />
          </form>
        )}

        {/* ─── Step 3: Set new password ─────────────────────────────────────── */}
        {step === 'set' && (
          <form onSubmit={handleSetPassword} noValidate>
            {/* Icon */}
            <div className="flex justify-center mb-5">
              <div className="w-14 h-14 rounded-2xl bg-[#0066cc]/10 flex items-center justify-center">
                <Lock className="w-7 h-7 text-[#0066cc]" />
              </div>
            </div>

            <h1
              className="text-center text-2xl font-semibold text-[#1d1d1f] mb-1"
              style={{ letterSpacing: '-0.374px' }}
            >
              Create new password
            </h1>
            <p className="text-center text-[15px] text-[#7a7a7a] mb-7 leading-snug">
              Choose a strong password for your account.
            </p>

            {/* New password */}
            <div className="mb-4">
              <label
                htmlFor="fp-new-password"
                className="block text-[13px] font-semibold text-[#1d1d1f] mb-1.5"
              >
                New password
              </label>
              <div className="relative">
                <input
                  id="fp-new-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  autoFocus
                  required
                  value={newPassword}
                  onChange={(e) => { setNewPassword(e.target.value); setSetError(null); }}
                  placeholder="At least 8 characters"
                  className="w-full h-11 rounded-xl border border-[#e0e0e0] bg-white pl-4 pr-11 text-[15px] text-[#1d1d1f] placeholder-[#7a7a7a] focus:outline-none focus:ring-2 focus:ring-[#0066cc]/30 focus:border-[#0066cc] transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[#7a7a7a] hover:text-[#1d1d1f] transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Confirm password */}
            <div className="mb-5">
              <label
                htmlFor="fp-confirm-password"
                className="block text-[13px] font-semibold text-[#1d1d1f] mb-1.5"
              >
                Confirm password
              </label>
              <div className="relative">
                <input
                  id="fp-confirm-password"
                  type={showConfirm ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  value={confirmPassword}
                  onChange={(e) => { setConfirmPassword(e.target.value); setSetError(null); }}
                  placeholder="Re-enter your password"
                  className="w-full h-11 rounded-xl border border-[#e0e0e0] bg-white pl-4 pr-11 text-[15px] text-[#1d1d1f] placeholder-[#7a7a7a] focus:outline-none focus:ring-2 focus:ring-[#0066cc]/30 focus:border-[#0066cc] transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm((v) => !v)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[#7a7a7a] hover:text-[#1d1d1f] transition-colors"
                  aria-label={showConfirm ? 'Hide password' : 'Show password'}
                >
                  {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <ClerkError message={setError} />
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={setLoading}
              className="w-full h-11 rounded-full bg-[#0066cc] text-white text-[15px] font-medium transition-all hover:bg-[#0071e3] active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {setLoading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Updating password...</>
              ) : (
                'Set New Password'
              )}
            </button>

            <BackToLogin />
          </form>
        )}

        {/* ─── Success overlay (shown briefly before redirect) ──────────────── */}
        {/* Navigation happens automatically in handleSetPassword */}
      </div>

      {/* Success state shown as a secondary card if ever needed */}
      <p className="mt-6 text-[13px] text-[#7a7a7a] text-center">
        Remember your password?{' '}
        <Link to="/login" className="text-[#0066cc] hover:opacity-80 transition-opacity no-underline">
          Sign in
        </Link>
      </p>
    </div>
  );
};
