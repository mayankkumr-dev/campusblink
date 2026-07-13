import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router';
import toast from 'react-hot-toast';
import { Loader2 } from 'lucide-react';
import { Input } from '../../app/components/ui/input';
import { signIn, resetPassword, resendConfirmationEmail } from '../../api/auth';
import { useAuthStore } from '../../store/authStore';
import { getFirstName } from '../../lib/user';
import { supabase } from '../../lib/supabase';
import {
  AuthScreenShell,
  AuthHeader,
  AuthStatusBanner,
  AuthStatus,
  EmailVerifiedBanner,
  ResendConfirmationBanner,
  PasswordFormField,
  AuthSubmitButton,
  AuthSwitchLink,
  ForgotPasswordModal,
  ProfessorPendingScreen,
  VERIFY_EMAIL_KEY,
  VERIFY_NAME_KEY,
} from './AuthFormShared';

export const LoginPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const authLoading = useAuthStore((state) => state.isLoading);
  const setUser = useAuthStore((state) => state.setUser);
  const setProfile = useAuthStore((state) => state.setProfile);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [authStatus, setAuthStatus] = useState<AuthStatus | null>(null);

  // Verification & feedback states
  const [showProfessorPendingScreen, setShowProfessorPendingScreen] = useState(false);
  const [pendingVerificationEmail, setPendingVerificationEmail] = useState('');
  const [showResendConfirmation, setShowResendConfirmation] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [emailVerifiedBanner, setEmailVerifiedBanner] = useState(false);
  const [verifyingEmailLink, setVerifyingEmailLink] = useState(false);

  // Forgot Password Modal
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmailInput, setForgotEmailInput] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotSuccessEmail, setForgotSuccessEmail] = useState<string | null>(null);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const id = window.setInterval(() => {
      setResendCooldown((prev) => (prev > 1 ? prev - 1 : 0));
    }, 1000);
    return () => window.clearInterval(id);
  }, [resendCooldown]);

  useEffect(() => {
    const savedEmail = localStorage.getItem(VERIFY_EMAIL_KEY) || '';

    const query = new URLSearchParams(location.search);
    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    const tokenHash = query.get('token_hash');
    const otpType = query.get('type');
    const statusCode = query.get('status');
    const hashType = hashParams.get('type');

    if (statusCode === 'professor_pending') {
      setShowProfessorPendingScreen(true);
    } else if (statusCode === 'professor_rejected') {
      setAuthStatus({
        type: 'error',
        title: 'Application Not Approved',
        message: 'Your professor application was not approved.',
      });
    }

    const finalizeVerification = async () => {
      if (tokenHash && otpType === 'signup') {
        setVerifyingEmailLink(true);
        let error = null;
        try {
          const res = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: 'signup',
          });
          error = res.error;
        } catch (err: any) {
          error = err;
        }
        setVerifyingEmailLink(false);

        if (error) {
          const message = String(error?.message || '').toLowerCase();
          setAuthStatus({
            type: 'error',
            title: 'Verification link invalid or expired',
            message: message.includes('expired')
              ? 'This verification link has expired. Please request a new one.'
              : 'We could not verify your email from this link. Please request a new one.',
          });
          setShowResendConfirmation(true);
          return;
        }

        setEmailVerifiedBanner(true);
        if (savedEmail) setEmail(savedEmail);
        setAuthStatus({
          type: 'success',
          title: 'Email verified',
          message: 'Your email is verified. You can log in now.',
        });
        window.history.replaceState({}, document.title, window.location.pathname);
        return;
      }

      const isEmailVerified = hashType === 'signup' || query.get('verified') === '1';

      if (isEmailVerified) {
        setEmailVerifiedBanner(true);
        if (savedEmail) setEmail(savedEmail);
        setTimeout(() => {
          const passwordEl = document.getElementById('auth-password');
          if (passwordEl instanceof HTMLInputElement) passwordEl.focus();
        }, 50);

        if (window.location.hash) {
          window.history.replaceState({}, document.title, `${window.location.pathname}${window.location.search}`);
        }
      }

      if (!isEmailVerified && savedEmail && !email) {
        setEmail(savedEmail);
      }
      if (savedEmail) {
        setPendingVerificationEmail(savedEmail);
      }
    };

    finalizeVerification();
  }, [location.search]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setAuthStatus(null);

    const { data, error } = await signIn(email, password);
    if (error) {
      const accountStatus = (error as any)?.accountStatus || '';
      const errorCode = (error as any)?.code || '';
      const restrictionReason = (error as any)?.reason || '';
      const message =
        error && typeof error === 'object' && 'message' in error
          ? String((error as { message?: string }).message)
          : 'Invalid credentials';
      const normalizedMessage = message.toLowerCase();

      if (errorCode === 'PROFESSOR_PENDING') {
        setAuthStatus({
          type: 'info',
          title: 'Application Under Review',
          message:
            'Your professor account is pending admin approval. You will receive an email once your account is approved.',
        });
        toast('Your professor account is pending admin approval.', { icon: '⏳' });
        setIsLoading(false);
        return;
      }

      if (errorCode === 'PROFESSOR_REJECTED') {
        setAuthStatus({
          type: 'error',
          title: 'Application Not Approved',
          message: message,
        });
        toast.error(message);
        setIsLoading(false);
        return;
      }

      if (
        errorCode === 'ACCOUNT_RESTRICTED' ||
        normalizedMessage.includes('account has been restricted') ||
        normalizedMessage.includes('account has been banned')
      ) {
        const params = new URLSearchParams({ status: accountStatus || 'restricted' });
        if (restrictionReason) params.set('reason', restrictionReason);
        if (email) params.set('email', email);
        navigate(`/account-restricted?${params.toString()}`);
        setIsLoading(false);
        return;
      }

      if (
        normalizedMessage.includes('verify your email') ||
        normalizedMessage.includes('email not confirmed') ||
        normalizedMessage.includes('email_not_confirmed')
      ) {
        setShowResendConfirmation(true);
        setAuthStatus({
          type: 'info',
          title: 'Email not verified',
          message: 'Please verify your email first. Check your inbox for the verification link.',
        });
        toast.error('Please verify your email first. Check your inbox for the verification link.');
      } else if (normalizedMessage.includes('invalid login credentials')) {
        setShowResendConfirmation(false);
        setAuthStatus({
          type: 'error',
          title: 'Wrong email or password',
          message: 'Either the password is wrong, or this email does not have a confirmed account yet.',
        });
        toast.error(message);
      } else {
        setShowResendConfirmation(false);
        setAuthStatus({
          type: 'error',
          title: 'Sign in failed',
          message,
        });
        toast.error(message);
      }
      setIsLoading(false);
      return;
    }

    if (!data) {
      setAuthStatus({
        type: 'error',
        title: 'Sign in failed',
        message: 'Unexpected authentication response.',
      });
      toast.error('Unexpected authentication response.');
      setIsLoading(false);
      return;
    }

    setShowResendConfirmation(false);
    setAuthStatus({
      type: 'success',
      title: 'Signed in successfully',
      message: 'Redirecting you to your dashboard now.',
    });

    const resolvedEmail = data.user?.email || data.profile?.email || email;
    const resolvedProfile = data.profile
      ? { ...data.profile, email: resolvedEmail }
      : data.profile;

    setUser(data.user);
    setProfile(resolvedProfile);
    toast.success(`Welcome back, ${getFirstName(data.profile?.name, 'Student')}! 👋`);

    const role = resolvedProfile?.role;
    const pendingTeacherRequest =
      data.user?.user_metadata?.requested_role === 'teacher' &&
      String(data.user?.user_metadata?.role_request_status || '').toLowerCase() === 'pending' &&
      String(resolvedProfile?.professor_status || 'pending').toLowerCase() === 'pending';
    const isAdminEmail = false;
    const redirectState =
      typeof location.state === 'object' && location.state && 'from' in location.state
        ? String((location.state as any).from || '')
        : '';
    const redirectTarget = new URLSearchParams(location.search).get('redirect');

    if (redirectState && redirectState.startsWith('/')) {
      navigate(redirectState, { replace: true });
      setIsLoading(false);
      return;
    }

    if (redirectTarget && redirectTarget.startsWith('/')) {
      navigate(redirectTarget, { replace: true });
      setIsLoading(false);
      return;
    }

    if (role === 'admin' || isAdminEmail) {
      navigate('/admin');
    } else if (role === 'professor') {
      const status = String(resolvedProfile?.professor_status || 'pending').toLowerCase();
      if (status === 'pending') navigate('/professor/pending');
      else if (status === 'rejected') navigate('/professor/rejected');
      else navigate('/professor/home');
    } else if (role === 'canteen_owner') navigate('/canteen-dashboard');
    else if (role === 'print_shop') navigate('/print-dashboard');
    else navigate('/student/home');

    if (pendingTeacherRequest) {
      toast('Your professor account request is pending admin approval.');
    }

    setIsLoading(false);
  };

  const handleForgotPassword = () => {
    setForgotEmailInput(email);
    setForgotSuccessEmail(null);
    setShowForgotModal(true);
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const inputVal = forgotEmailInput.trim();
    if (!inputVal) {
      toast.error('Please enter your registered email or username.');
      return;
    }

    setForgotLoading(true);
    let targetEmail = inputVal;
    if (!inputVal.includes('@')) {
      try {
        const { data, error: rpcError } = await supabase.rpc('get_email_by_username', {
          p_username: inputVal,
        });
        if (rpcError || !data) {
          toast.error('Username not found. Please enter your registered email address.');
          setForgotLoading(false);
          return;
        }
        targetEmail = data;
      } catch (err) {
        toast.error('Failed to look up username.');
        setForgotLoading(false);
        return;
      }
    }

    const { error } = await resetPassword(
      targetEmail,
      `${window.location.origin}/auth/callback?type=recovery`
    );
    setForgotLoading(false);

    if (error) {
      const errorMessage =
        error && typeof error === 'object' && 'message' in error
          ? String((error as { message?: string }).message)
          : 'Failed to send reset email.';
      toast.error(errorMessage);
      return;
    }

    setForgotSuccessEmail(targetEmail);
    toast.success('Password reset email sent!');
  };

  const handleResendConfirmation = async () => {
    const targetEmail = email || pendingVerificationEmail;
    if (!targetEmail) {
      toast.error('Enter your email first.');
      return;
    }
    if (resendCooldown > 0) return;

    const { error } = await resendConfirmationEmail(
      targetEmail,
      `${window.location.origin}/auth/callback?type=signup`
    );
    if (error) {
      const errorMessage =
        error && typeof error === 'object' && 'message' in error
          ? String((error as { message?: string }).message)
          : 'Failed to resend confirmation email.';

      if (errorMessage.toLowerCase().includes('rate limit')) {
        setResendCooldown((prev) => (prev > 0 ? prev : 60));
        setAuthStatus({
          type: 'info',
          title: 'Too many resend attempts',
          message: 'Please wait 60 seconds and try again.',
        });
        toast.error('Please wait 60 seconds before requesting another email.');
        return;
      }

      setAuthStatus({
        type: 'error',
        title: 'Resend failed',
        message: errorMessage,
      });
      toast.error(errorMessage);
      return;
    }

    setResendCooldown(60);
    setAuthStatus({
      type: 'info',
      title: 'Verification email sent',
      message:
        'Check your inbox and spam folder, then open the confirmation link and try signing in again.',
    });
    toast.success('Verification email resent! Check your inbox.');
  };

  if (showProfessorPendingScreen) {
    return (
      <ProfessorPendingScreen
        email={email || pendingVerificationEmail}
        onGoLogin={() => setShowProfessorPendingScreen(false)}
      />
    );
  }

  return (
    <AuthScreenShell>
      <AuthHeader
        title="Welcome Back"
        subtitle="Enter your details to sign in to your account"
      />

      {verifyingEmailLink && (
        <div className="mb-5 rounded-lg border border-[var(--yellow)]/40 bg-[var(--yellow)]/10 px-4 py-3 flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin text-[var(--text-primary)]" />
          <p className="font-sans font-bold text-sm text-[var(--text-primary)]">
            Verifying your email link...
          </p>
        </div>
      )}

      <EmailVerifiedBanner show={emailVerifiedBanner} />
      <AuthStatusBanner status={authStatus} />
      <ResendConfirmationBanner
        show={showResendConfirmation}
        resendCooldown={resendCooldown}
        onResend={handleResendConfirmation}
      />

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
