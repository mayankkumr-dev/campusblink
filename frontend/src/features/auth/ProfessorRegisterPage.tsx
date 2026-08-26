import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import toast from 'react-hot-toast';
import { Input } from '../../app/components/ui/input';
import { signUp, resendConfirmationEmail } from '../../api/auth';
import { getFirstName } from '../../lib/user';
import {
  AuthScreenShell,
  AuthHeader,
  AuthStatusBanner,
  AuthStatus,
  PostSignupVerificationScreen,
  PasswordFormField,
  UsernameFormField,
  CollegeSelectField,
  AuthSubmitButton,
  AuthSwitchLink,
  useUsernameAvailability,
  normalizeUsernameInput,
  ONLY_COLLEGE,
  VERIFY_EMAIL_KEY,
  VERIFY_NAME_KEY,
} from './AuthFormShared';

export interface ProfessorRegisterPageProps {
  onSwitchToStudent?: () => void;
}

export const ProfessorRegisterPage: React.FC<ProfessorRegisterPageProps> = ({
  onSwitchToStudent,
}) => {
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [staffRoomNumber, setStaffRoomNumber] = useState('');
  const [college, setCollege] = useState(ONLY_COLLEGE);
  const [isLoading, setIsLoading] = useState(false);
  const [authStatus, setAuthStatus] = useState<AuthStatus | null>(null);

  const { username, setUsername, status: usernameStatus } = useUsernameAvailability('');

  // Verification screen state
  const [showPostSignupScreen, setShowPostSignupScreen] = useState(false);
  const [pendingVerification, setPendingVerification] = useState<{
    email: string;
    firstName: string;
  } | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const id = window.setInterval(() => {
      setResendCooldown((prev) => (prev > 1 ? prev - 1 : 0));
    }, 1000);
    return () => window.clearInterval(id);
  }, [resendCooldown]);

  const handleResendConfirmation = async () => {
    const targetEmail = pendingVerification?.email || email;
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
        toast.error('Please wait 60 seconds before requesting another email.');
        return;
      }
      toast.error(errorMessage);
      return;
    }

    setResendCooldown(60);
    toast.success('Verification email resent! Check your inbox.');
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setAuthStatus(null);

    const fullName = name.trim();
    const normalizedUsername = normalizeUsernameInput(username);

    if (!college) {
      setAuthStatus({
        type: 'error',
        title: 'College required',
        message: 'Please select your college from the dropdown.',
      });
      toast.error('Please select your college from the dropdown.');
      setIsLoading(false);
      return;
    }

    if (!normalizedUsername) {
      setAuthStatus({
        type: 'error',
        title: 'Username required',
        message: 'Please choose a username before creating your account.',
      });
      toast.error('Please choose a username before creating your account.');
      setIsLoading(false);
      return;
    }

    if (usernameStatus.state !== 'available') {
      setAuthStatus({
        type: 'error',
        title: 'Username unavailable',
        message: usernameStatus.message || 'Choose an available username to continue.',
      });
      toast.error(usernameStatus.message || 'Choose an available username to continue.');
      setIsLoading(false);
      return;
    }

    if (!staffRoomNumber.trim()) {
      setAuthStatus({
        type: 'error',
        title: 'Staff room required',
        message: 'Please enter your staff room number.',
      });
      toast.error('Please enter your staff room number.');
      setIsLoading(false);
      return;
    }

    const pwd = password || '';
    if (pwd.length < 8) {
      setAuthStatus({
        type: 'error',
        title: 'Weak password',
        message: 'Password must be at least 8 characters long.',
      });
      toast.error('Password must be at least 8 characters long.');
      setIsLoading(false);
      return;
    }

    const { error: signUpError } = await signUp(
      email,
      password,
      fullName,
      college,
      normalizedUsername,
      {},
      'teacher',
      { staffRoomNumber: staffRoomNumber.trim() },
      '',
      ''
    );

    const error = signUpError;
    if (error) {
      const errorCode = (error as any)?.code || '';
      const errorMessage =
        error && typeof error === 'object' && 'message' in error
          ? String((error as { message?: string }).message)
          : 'We could not create your account right now.';

      if (errorCode === 'ALREADY_REGISTERED_UNVERIFIED') {
        const firstName = getFirstName(fullName, 'Professor');
        localStorage.setItem(VERIFY_EMAIL_KEY, email);
        localStorage.setItem(VERIFY_NAME_KEY, fullName);
        setPendingVerification({ email, firstName });
        setShowPostSignupScreen(true);
        setResendCooldown(60);
        setIsLoading(false);
        return;
      }

      if (errorCode === 'ALREADY_REGISTERED') {
        navigate('/login');
        setIsLoading(false);
        return;
      }

      if (
        errorCode === 'EMAIL_RATE_LIMIT' ||
        errorMessage.toLowerCase().includes('rate limit')
      ) {
        setAuthStatus({
          type: 'info',
          title: 'Email limit reached',
          message:
            'Supabase has a limit on verification emails. Please wait a few minutes and try again.',
        });
        toast.error('Email rate limit reached — please wait a moment and retry.');
        setIsLoading(false);
        return;
      }

      setAuthStatus({
        type: 'error',
        title: 'Registration failed',
        message: errorMessage,
      });
      toast.error(errorMessage || 'Failed to register');
    } else {
      const firstName = getFirstName(fullName, 'Professor');
      localStorage.setItem(VERIFY_EMAIL_KEY, email);
      localStorage.setItem(VERIFY_NAME_KEY, fullName);
      setPendingVerification({ email, firstName });

      setShowPostSignupScreen(true);
      setResendCooldown(0);
    }
    setIsLoading(false);
  };

  if (showPostSignupScreen && pendingVerification) {
    return (
      <PostSignupVerificationScreen
        pendingVerification={pendingVerification}
        resendCooldown={resendCooldown}
        onResend={handleResendConfirmation}
      />
    );
  }

  return (
    <AuthScreenShell>
      <AuthHeader
        title="Professor Sign Up"
        subtitle="Create your faculty account for Campus Blink"
      />

      <AuthStatusBanner status={authStatus} />

      <div id="clerk-captcha"></div>

      <form onSubmit={handleRegister} className="space-y-4 lg:space-y-3.5">
        <div>
          <span className="text-sm font-medium ml-1">Full Name</span>
          <Input
            placeholder="Dr. / Prof. Name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>

        <UsernameFormField
          value={username}
          onChange={setUsername}
          status={usernameStatus}
        />

        <CollegeSelectField value={college} onChange={setCollege} />

        <div className="mt-2 rounded-lg border border-[var(--yellow)]/30 bg-[var(--yellow)]/10 p-3">
          <p className="text-xs font-medium text-[var(--text-secondary)]">
            Professor accounts will be submitted for admin approval after signup.
          </p>
          <div className="mt-3">
            <span className="text-sm font-medium ml-1">Staff Room Number *</span>
            <Input
              placeholder="e.g. A-201"
              type="text"
              value={staffRoomNumber}
              onChange={(e) => setStaffRoomNumber(e.target.value)}
              required
            />
            <p className="mt-1 text-xs font-medium text-[var(--text-secondary)]">
              Your staff room / cabin number for delivery orders.
            </p>
          </div>
        </div>

        <div>
          <span className="text-sm font-medium ml-1">Email</span>
          <Input
            placeholder="Enter your college faculty email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <PasswordFormField
          label="Password"
          value={password}
          onChange={setPassword}
          placeholder="Create a strong password"
          id="professor-register-password"
        />

        <AuthSubmitButton loading={isLoading} text="Create Professor Account" />
      </form>

      <div className="mt-4 text-center">
        <button
          type="button"
          onClick={() => {
            if (onSwitchToStudent) onSwitchToStudent();
            else navigate('/register');
          }}
          className="text-xs font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] underline"
        >
          Are you a Student? Sign up as Student
        </button>
      </div>

      <AuthSwitchLink
        question="Already have an account?"
        actionText="Log In"
        to="/login"
      />
    </AuthScreenShell>
  );
};
