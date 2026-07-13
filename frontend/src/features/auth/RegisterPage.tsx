import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { motion } from 'motion/react';
import toast from 'react-hot-toast';
import { Loader2 } from 'lucide-react';
import { Input } from '../../app/components/ui/input';
import { Button } from '../../app/components/ui/button';
import { signUp, resendConfirmationEmail } from '../../api/auth';
import { formatInviteCodeInput, validateInviteCode } from '../../api/invites';
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
  StudentAcademicFields,
  AuthSubmitButton,
  AuthSwitchLink,
  useUsernameAvailability,
  normalizeUsernameInput,
  ONLY_COLLEGE,
  VERIFY_EMAIL_KEY,
  VERIFY_NAME_KEY,
} from './AuthFormShared';
import { ProfessorRegisterPage } from './ProfessorRegisterPage';

export const RegisterPage: React.FC = () => {
  const navigate = useNavigate();

  const [registerStep, setRegisterStep] = useState<1 | 2>(1);
  const [isProfessor, setIsProfessor] = useState(false);

  // Invite code states
  const [inviteInput, setInviteInput] = useState('');
  const [validatingInvite, setValidatingInvite] = useState(false);
  const [inviteError, setInviteError] = useState('');
  const [inviteShake, setInviteShake] = useState(false);
  const [inviteValidated, setInviteValidated] = useState<any>(null);

  // Form fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [college, setCollege] = useState(ONLY_COLLEGE);
  const [studyYear, setStudyYear] = useState('');
  const [branch, setBranch] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [authStatus, setAuthStatus] = useState<AuthStatus | null>(null);

  const { username, setUsername, status: usernameStatus } = useUsernameAvailability('');

  // Post-signup verification screen
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

  const handleValidateInvite = async () => {
    const code = inviteInput.trim();
    if (!code) {
      setInviteError('Please enter an invite code');
      setInviteShake(true);
      setTimeout(() => setInviteShake(false), 400);
      return;
    }

    setValidatingInvite(true);
    setInviteError('');

    try {
      const res = await validateInviteCode(code);
      if (!res.valid || res.error) {
        setInviteError(res.error || 'Invalid invite code');
        setInviteShake(true);
        setTimeout(() => setInviteShake(false), 400);
      } else {
        setInviteValidated(res);
        setRegisterStep(2);
        toast.success('Invite code verified! ✨');
      }
    } catch (err: any) {
      setInviteError('Failed to validate invite code');
    } finally {
      setValidatingInvite(false);
    }
  };

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

  const handleStudentRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setAuthStatus(null);

    if (!inviteValidated?.code) {
      setAuthStatus({
        type: 'error',
        title: 'Invite required',
        message: 'Please validate an invite code before creating your account.',
      });
      setIsLoading(false);
      return;
    }

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

    const pwd = password || '';
    if (
      pwd.length < 8 ||
      !/[A-Z]/.test(pwd) ||
      !/[a-z]/.test(pwd) ||
      !/[0-9]/.test(pwd) ||
      !/[!?@#$%^&*_\-]/.test(pwd)
    ) {
      setAuthStatus({
        type: 'error',
        title: 'Weak password',
        message:
          'Password must be at least 8 characters long and include an uppercase letter, a lowercase letter, a number, and a special character.',
      });
      toast.error(
        'Password must be at least 8 characters with 1 uppercase, 1 lowercase, 1 number, and 1 special character.'
      );
      setIsLoading(false);
      return;
    }

    if (!studyYear) {
      toast.error('Please select your year of study.');
      setIsLoading(false);
      return;
    }
    if (!branch) {
      toast.error('Please select your branch.');
      setIsLoading(false);
      return;
    }

    const { error: signUpError } = await signUp(
      email,
      password,
      fullName,
      college,
      normalizedUsername,
      { code: inviteValidated.code },
      'student',
      {},
      studyYear,
      branch
    );

    const error = signUpError;
    if (error) {
      const errorCode = (error as any)?.code || '';
      const errorMessage =
        error && typeof error === 'object' && 'message' in error
          ? String((error as { message?: string }).message)
          : 'We could not create your account right now.';

      if (errorCode === 'ALREADY_REGISTERED_UNVERIFIED') {
        const firstName = getFirstName(fullName, 'Student');
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
      const firstName = getFirstName(fullName, 'Student');
      localStorage.setItem(VERIFY_EMAIL_KEY, email);
      localStorage.setItem(VERIFY_NAME_KEY, fullName);
      setPendingVerification({ email, firstName });

      setShowPostSignupScreen(true);
      setResendCooldown(0);
    }
    setIsLoading(false);
  };

  if (isProfessor) {
    return <ProfessorRegisterPage onSwitchToStudent={() => setIsProfessor(false)} />;
  }

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
        title={registerStep === 1 ? 'You need an invite.' : 'Join Campus'}
        subtitle={
          registerStep === 1
            ? 'Campus Blink is invite-only for students.'
            : 'Create your verified student account'
        }
      />

      <AuthStatusBanner status={authStatus} />

      {registerStep === 1 ? (
        <div className="space-y-4">
          <div className="text-center">
            <div className="text-5xl mb-2">(^_~)</div>
            <p className="font-sans text-sm text-[var(--text-secondary)]">
              Enter your invite code to continue
            </p>
          </div>

          <motion.div
            animate={inviteShake ? { x: [0, -8, 8, -6, 6, 0] } : { x: 0 }}
            transition={{ duration: 0.35 }}
            className="space-y-2"
          >
            <span className="text-sm font-medium ml-1">Invite Code</span>
            <Input
              placeholder="CB-XXXX-XXXX"
              type="text"
              value={inviteInput}
              onChange={(e) => {
                const value = formatInviteCodeInput(e.target.value);
                setInviteInput(value);
                setInviteError('');
                setAuthStatus(null);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  if (!validatingInvite && inviteInput.trim().length >= 3) {
                    handleValidateInvite();
                  }
                }
              }}
              className={`uppercase tracking-[0.18em] text-center font-bold ${
                inviteError
                  ? 'border-[var(--error)] focus:border-[var(--error)] focus:ring-[var(--error)]/25'
                  : inviteValidated
                    ? 'border-[#16A34A] focus:border-[#16A34A] focus:ring-[#16A34A]/25'
                    : ''
              }`}
              required
            />
          </motion.div>

          {inviteValidated?.inviter?.name ? (
            <div className="rounded-lg border border-[#16A34A]/30 bg-[#16A34A]/10 px-4 py-3">
              <p className="font-sans text-sm font-bold text-[var(--text-primary)]">
                ✅ Invited by {getFirstName(inviteValidated.inviter.name, 'a friend')}
              </p>
            </div>
          ) : null}

          {inviteError ? (
            <div className="rounded-lg border border-[var(--error)]/30 bg-[var(--error)]/10 px-4 py-3">
              <p className="font-sans text-sm text-[#B42318] font-bold">{inviteError}</p>
            </div>
          ) : null}

          <Button
            disabled={validatingInvite || inviteInput.trim().length < 3}
            type="button"
            size="lg"
            onClick={handleValidateInvite}
            className="w-full bg-[var(--yellow)] text-[var(--text-primary)] font-bold hover:bg-[var(--text-primary)] hover:text-[var(--yellow)] mt-2"
          >
            {validatingInvite ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Continue'}
          </Button>

          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={() => setIsProfessor(true)}
              className="text-xs font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] underline"
            >
              Are you a Professor/Faculty member? Sign up as Professor
            </button>
          </div>

          <AuthSwitchLink
            question="Already have an account?"
            actionText="Log In"
            to="/login"
          />
        </div>
      ) : (
        <form onSubmit={handleStudentRegister} className="space-y-4 lg:space-y-3.5">
          {inviteValidated ? (
            <div className="rounded-lg border border-[#16A34A]/30 bg-[#16A34A]/10 px-4 py-3 flex items-center justify-between gap-3">
              <p className="font-sans text-sm font-bold text-[var(--text-primary)]">
                ✅ Invited by {getFirstName(inviteValidated?.inviter?.name, 'a friend')}
              </p>
              <span className="text-xs font-bold text-accent-green uppercase tracking-[0.16em]">
                {inviteValidated.code}
              </span>
            </div>
          ) : null}

          <div>
            <span className="text-sm font-medium ml-1">Full Name</span>
            <Input
              placeholder="What do your friends call you?"
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

          <StudentAcademicFields
            college={college}
            studyYear={studyYear}
            onStudyYearChange={setStudyYear}
            branch={branch}
            onBranchChange={setBranch}
          />

          <div>
            <span className="text-sm font-medium ml-1">Email</span>
            <Input
              placeholder="Enter your college email"
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
            id="register-password"
          />

          <AuthSubmitButton
            loading={isLoading}
            disabled={usernameStatus.state !== 'available'}
            text="Create Account"
          />

          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={() => setIsProfessor(true)}
              className="text-xs font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] underline"
            >
              Are you a Professor/Faculty member? Sign up as Professor
            </button>
          </div>

          <AuthSwitchLink
            question="Already have an account?"
            actionText="Log In"
            to="/login"
          />
        </form>
      )}
    </AuthScreenShell>
  );
};
