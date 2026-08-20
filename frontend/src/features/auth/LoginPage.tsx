import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router';
import toast from 'react-hot-toast';
import { Loader2 } from 'lucide-react';
import { Input } from '../../app/components/ui/input';
import { useSignIn, useClerk } from '@clerk/clerk-react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import {
  AuthScreenShell,
  AuthHeader,
  AuthStatusBanner,
  AuthStatus,
  PasswordFormField,
  AuthSubmitButton,
  AuthSwitchLink,
  ForgotPasswordModal,
  ProfessorPendingScreen,
} from './AuthFormShared';

export const LoginPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { isLoaded, signIn, setActive } = useSignIn();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [authStatus, setAuthStatus] = useState<AuthStatus | null>(null);

  // Verification & feedback states
  const [showProfessorPendingScreen, setShowProfessorPendingScreen] = useState(false);
  const [pendingVerificationEmail, setPendingVerificationEmail] = useState('');

  // MFA / second-factor step
  const [mfaStep, setMfaStep] = useState(false);
  const [mfaCode, setMfaCode] = useState('');

  // Forgot Password Modal
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmailInput, setForgotEmailInput] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotSuccessEmail, setForgotSuccessEmail] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoaded || !signIn) return;

    setIsLoading(true);
    setAuthStatus(null);

    try {
      let identifier = email.trim();

      const result = await signIn.create({
        identifier,
        password,
      });

      if (result.status === 'complete') {
        await setActive({ session: result.createdSessionId });

        // Fetch Supabase profile to determine where to redirect
        // Try by clerk_user_id first (for linked accounts), fallback to email/identifier
        let { data: profile } = await supabase
          .from('profiles')
          .select('role, professor_status, status, ban_reason')
          .eq('clerk_user_id', (result as any).createdUserId)
          .maybeSingle();

        if (!profile && identifier.includes('@')) {
          const { data: fallbackProfile } = await supabase
            .from('profiles')
            .select('role, professor_status, status, ban_reason')
            .eq('email', identifier)
            .maybeSingle();
          profile = fallbackProfile;
        }

        const role = profile?.role;
        const redirectState =
          typeof location.state === 'object' && location.state && 'from' in location.state
            ? String((location.state as any).from || '')
            : '';
        const redirectTarget = new URLSearchParams(location.search).get('redirect');

        // Check account status
        const status = String(profile?.status || 'active').toLowerCase();
        if (status === 'restricted' || status === 'banned') {
          const params = new URLSearchParams({ status });
          if (profile?.ban_reason) params.set('reason', profile.ban_reason);
          params.set('email', identifier);
          navigate(`/account-restricted?${params.toString()}`);
          setIsLoading(false);
          return;
        }

        if (redirectState && redirectState.startsWith('/')) {
          navigate(redirectState, { replace: true });
          return;
        }
        if (redirectTarget && redirectTarget.startsWith('/')) {
          navigate(redirectTarget, { replace: true });
          return;
        }

        if (role === 'admin') navigate('/admin');
        else if (role === 'professor') {
          const profStatus = String(profile?.professor_status || 'pending').toLowerCase();
          if (profStatus === 'pending') {
            setShowProfessorPendingScreen(true);
          } else if (profStatus === 'rejected') {
            navigate('/professor/rejected');
          } else {
            navigate('/professor/home');
          }
        } else if (role === 'canteen_owner') navigate('/canteen-dashboard');
        else if (role === 'print_shop') navigate('/print-dashboard');
        else navigate('/student/home');

        setAuthStatus({
          type: 'success',
          title: 'Signed in successfully',
          message: 'Redirecting you to your dashboard now.',
        });
      } else if (result.status === 'needs_second_factor') {
        // Clerk requires a second factor (email_code). Show OTP input.
        const strategies = result.supportedSecondFactors?.map((f: any) => f.strategy) || [];
        if (strategies.includes('email_code')) {
          // Trigger Clerk to send the email code
          await signIn.prepareSecondFactor({ strategy: 'email_code' });
          setMfaStep(true);
          setMfaCode('');
          setAuthStatus({
            type: 'info',
            title: 'Check your email',
            message: 'A verification code has been sent to your email. Enter it below to sign in.',
          });
        } else {
          setAuthStatus({
            type: 'error',
            title: '2FA Required',
            message: `Your account requires a second factor. Supported: ${strategies.join(', ')}`,
          });
        }
      } else {
        setAuthStatus({
          type: 'info',
          title: 'Additional step required',
          message: `Sign in status: ${result.status}. Please try again or contact support.`,
        });
      }
    } catch (err: any) {
      console.error("LOGIN ERROR:", err);
      const clerkError = err?.errors?.[0];
      const code = clerkError?.code || '';
      const message = clerkError?.longMessage || clerkError?.message || err?.message || 'Invalid credentials';

      if (code === 'form_password_incorrect' || code === 'form_identifier_not_found') {
        setAuthStatus({
          type: 'error',
          title: 'Wrong email or password',
          message: 'Either the password is wrong, or this email does not have an account yet.',
        });
        toast.error('Wrong email or password');
      } else if (code === 'form_identifier_not_found') {
        setAuthStatus({
          type: 'error',
          title: 'Account not found',
          message: 'No account found with this email. Please sign up first.',
        });
        toast.error('Account not found');
      } else if (code === 'form_password_pwned') {
        setAuthStatus({
          type: 'error',
          title: 'Security Warning',
          message: 'Your password was found in an online data breach. For account safety, please reset your password.',
        });
        toast.error('Password breached. Please reset your password.');
        // Automatically open the forgot password modal
        setForgotEmailInput(email);
        setForgotSuccessEmail(null);
        setShowForgotModal(true);
      } else {
        setAuthStatus({
          type: 'error',
          title: 'Sign in failed',
          message,
        });
        toast.error(message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // ── MFA second-factor submit ───────────────────────────────────────────────
  const handleMfaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoaded || !signIn) return;

    const code = mfaCode.trim();
    if (!code) {
      toast.error('Please enter the verification code.');
      return;
    }

    setIsLoading(true);
    setAuthStatus(null);

    try {
      const result = await signIn.attemptSecondFactor({
        strategy: 'email_code',
        code,
      });

      if (result.status === 'complete') {
        await setActive({ session: result.createdSessionId });

        let identifier = email.trim();
        let { data: profile } = await supabase
          .from('profiles')
          .select('role, professor_status, status, ban_reason')
          .eq('clerk_user_id', (result as any).createdUserId)
          .maybeSingle();

        if (!profile && identifier.includes('@')) {
          const { data: fallbackProfile } = await supabase
            .from('profiles')
            .select('role, professor_status, status, ban_reason')
            .eq('email', identifier)
            .maybeSingle();
          profile = fallbackProfile;
        }

        const role = profile?.role;
        const acctStatus = String(profile?.status || 'active').toLowerCase();
        if (acctStatus === 'restricted' || acctStatus === 'banned') {
          const params = new URLSearchParams({ status: acctStatus });
          if (profile?.ban_reason) params.set('reason', profile.ban_reason);
          params.set('email', identifier);
          navigate(`/account-restricted?${params.toString()}`);
          return;
        }

        const redirectState =
          typeof location.state === 'object' && location.state && 'from' in location.state
            ? String((location.state as any).from || '')
            : '';
        const redirectTarget = new URLSearchParams(location.search).get('redirect');

        if (redirectState && redirectState.startsWith('/')) { navigate(redirectState, { replace: true }); return; }
        if (redirectTarget && redirectTarget.startsWith('/')) { navigate(redirectTarget, { replace: true }); return; }

        if (role === 'admin') navigate('/admin');
        else if (role === 'professor') {
          const profStatus = String(profile?.professor_status || 'pending').toLowerCase();
          if (profStatus === 'pending') setShowProfessorPendingScreen(true);
          else if (profStatus === 'rejected') navigate('/professor/rejected');
          else navigate('/professor/home');
        } else if (role === 'canteen_owner') navigate('/canteen-dashboard');
        else if (role === 'print_shop') navigate('/print-dashboard');
        else navigate('/student/home');
      } else {
        setAuthStatus({
          type: 'error',
          title: 'Invalid code',
          message: 'The code you entered is incorrect or has expired. Please try again.',
        });
        toast.error('Invalid verification code.');
      }
    } catch (err: any) {
      const msg = err?.errors?.[0]?.longMessage || err?.errors?.[0]?.message || 'Verification failed.';
      setAuthStatus({ type: 'error', title: 'Verification failed', message: msg });
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = () => {
    setForgotEmailInput(email);
    setForgotSuccessEmail(null);
    setShowForgotModal(true);
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoaded || !signIn) return;

    const inputVal = forgotEmailInput.trim();
    if (!inputVal) {
      toast.error('Please enter your registered email.');
      return;
    }

    setForgotLoading(true);
    // Clerk natively supports identifier (email or username) for password reset
    let targetEmail = inputVal;

    try {
      await signIn.create({
        strategy: 'reset_password_email_code',
        identifier: targetEmail,
      });
      setForgotSuccessEmail(targetEmail);
      toast.success('Password reset email sent!');
    } catch (err: any) {
      const msg = err?.errors?.[0]?.longMessage || 'Failed to send reset email.';
      toast.error(msg);
    } finally {
      setForgotLoading(false);
    }
  };

  if (showProfessorPendingScreen) {
    return (
      <ProfessorPendingScreen
        email={email || pendingVerificationEmail}
        onGoLogin={() => setShowProfessorPendingScreen(false)}
      />
    );
  }

  // ── MFA / email-code step ──────────────────────────────────────────────────
  if (mfaStep) {
    return (
      <AuthScreenShell>
        <AuthHeader
          title="Verify your identity"
          subtitle={`We sent a 6-digit code to ${email || 'your email'}. Enter it below.`}
        />

        <AuthStatusBanner status={authStatus} />

        <form onSubmit={handleMfaSubmit} className="space-y-4">
          <div>
            <span className="text-sm font-medium ml-1">Verification Code</span>
            <Input
              placeholder="Enter 6-digit code"
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={mfaCode}
              onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, ''))}
              required
              autoFocus
              autoComplete="one-time-code"
            />
          </div>

          <AuthSubmitButton loading={isLoading} text="Verify & Sign In" />
        </form>

        <button
          type="button"
          onClick={() => { setMfaStep(false); setAuthStatus(null); setMfaCode(''); }}
          className="text-sm text-center w-full text-muted-foreground hover:underline mt-2"
        >
          ← Back to sign in
        </button>
      </AuthScreenShell>
    );
  }

  // ── Normal login form ──────────────────────────────────────────────────────
  return (
    <AuthScreenShell>
      <AuthHeader
        title="Welcome Back"
        subtitle="Enter your details to sign in to your account"
      />

      <AuthStatusBanner status={authStatus} />

      <form onSubmit={handleLogin} className="space-y-4 lg:space-y-3.5">
        <div>
          <span className="text-sm font-medium ml-1">Email or Username</span>
          <Input
            placeholder="Enter email or username"
            type="text"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoCapitalize="none"
            autoCorrect="off"
          />
        </div>

        <PasswordFormField
          label="Password"
          value={password}
          onChange={setPassword}
          placeholder="Enter your password"
          id="auth-password"
          forgotPasswordAction={handleForgotPassword}
        />

        <AuthSubmitButton loading={isLoading} text="Sign In" />
      </form>

      <AuthSwitchLink
        question="Don't have an account?"
        actionText="Sign Up"
        to="/register"
      />

      <ForgotPasswordModal
        show={showForgotModal}
        onClose={() => setShowForgotModal(false)}
        emailInput={forgotEmailInput}
        onEmailInputChange={setForgotEmailInput}
        onSubmit={handleForgotSubmit}
        loading={forgotLoading}
        successEmail={forgotSuccessEmail}
      />

    </AuthScreenShell>
  );
};
