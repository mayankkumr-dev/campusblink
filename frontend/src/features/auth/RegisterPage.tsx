import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { motion } from 'motion/react';
import toast from 'react-hot-toast';
import { Loader2 } from 'lucide-react';
import { Input } from '../../app/components/ui/input';
import { Button } from '../../app/components/ui/button';
import { useSignUp, useAuth } from '@clerk/clerk-react';
import { formatInviteCodeInput, validateInviteCode } from '../../api/invites';
import { getFirstName } from '../../lib/user';
import {
  AuthScreenShell,
  AuthHeader,
  AuthStatusBanner,
  AuthStatus,
  PasswordFormField,
  UsernameFormField,
  CollegeSelectField,
  StudentAcademicFields,
  AuthSubmitButton,
  AuthSwitchLink,
  useUsernameAvailability,
  normalizeUsernameInput,
  ONLY_COLLEGE,
} from './AuthFormShared';
import { ProfessorRegisterPage } from './ProfessorRegisterPage';

// ---------------------------------------------------------------------------
// Step 3: Email verification screen (Clerk OTP)
// ---------------------------------------------------------------------------
interface VerifyEmailProps {
  email: string;
  firstName: string;
  onVerify: (code: string) => Promise<void>;
  onResend: () => Promise<void>;
  verifying: boolean;
  verifyError: string;
}

const VerifyEmailScreen: React.FC<VerifyEmailProps> = ({
  email, firstName, onVerify, onResend, verifying, verifyError,
}) => {
  const [code, setCode] = useState('');
  const [resendCooldown, setResendCooldown] = useState(60);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const id = setInterval(() => setResendCooldown((p) => (p > 1 ? p - 1 : 0)), 1000);
    return () => clearInterval(id);
  }, [resendCooldown]);

  return (
    <AuthScreenShell>
      <AuthHeader
        title={`Hey ${firstName}! 👋`}
        subtitle="Check your inbox for a verification code"
      />

      <div className="rounded-xl border border-[var(--yellow)]/40 bg-[var(--yellow)]/10 px-4 py-3 mb-2">
        <p className="font-sans text-sm font-bold text-[var(--text-primary)]">
          We sent a 6-digit code to <span className="text-amber-600">{email}</span>
        </p>
      </div>

      {verifyError && (
        <div className="rounded-lg border border-[var(--error)]/30 bg-[var(--error)]/10 px-4 py-3">
          <p className="font-sans text-sm text-[#B42318] font-bold">{verifyError}</p>
        </div>
      )}

      <div className="space-y-4">
        <div>
          <span className="text-sm font-medium ml-1">Verification Code</span>
          <Input
            placeholder="Enter 6-digit code"
            type="text"
            inputMode="numeric"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            className="text-center tracking-[0.3em] font-bold text-lg"
            autoFocus
          />
        </div>

        <Button
          type="button"
          size="lg"
          disabled={verifying || code.length < 6}
          onClick={() => onVerify(code)}
          className="w-full bg-[var(--yellow)] text-[var(--text-primary)] font-bold hover:bg-[var(--text-primary)] hover:text-[var(--yellow)]"
        >
          {verifying ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Verify Email'}
        </Button>

        <div className="text-center">
          <button
            type="button"
            disabled={resendCooldown > 0}
            onClick={async () => {
              await onResend();
              setResendCooldown(60);
            }}
            className="text-xs font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] underline disabled:opacity-40"
          >
            {resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : 'Resend code'}
          </button>
        </div>
      </div>
    </AuthScreenShell>
  );
};

// ---------------------------------------------------------------------------
// Main RegisterPage
// ---------------------------------------------------------------------------
export const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const { isLoaded, signUp, setActive } = useSignUp();
  const { isSignedIn } = useAuth();
  
  // Track if we've already checked the initial sign-in state to avoid triggering on successful registration
  const hasCheckedInitialAuth = React.useRef(false);

  useEffect(() => {
    if (hasCheckedInitialAuth.current) return;
    hasCheckedInitialAuth.current = true;

    if (isSignedIn) {
      toast('Signing you out of your previous session...', { icon: '🧹' });
      // Clear all stuck state
      localStorage.clear();
      document.cookie.split(";").forEach((c) => {
        document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
      });
      if (typeof window !== 'undefined' && (window as any).Clerk) {
        (window as any).Clerk.signOut().then(() => {
          window.location.reload();
        }).catch(() => {
          window.location.reload();
        });
      }
    }
  }, [isSignedIn]);

  const [registerStep, setRegisterStep] = useState<1 | 2 | 3>(1);
  const [isProfessor, setIsProfessor] = useState(false);

  // ── Step 1: Invite code ──────────────────────────────────────────────────
  const [inviteInput, setInviteInput] = useState('');
  const [validatingInvite, setValidatingInvite] = useState(false);
  const [inviteError, setInviteError] = useState('');
  const [inviteShake, setInviteShake] = useState(false);
  const [inviteValidated, setInviteValidated] = useState<any>(null);

  // ── Step 2: Form fields ──────────────────────────────────────────────────
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [college, setCollege] = useState(ONLY_COLLEGE);
  const [studyYear, setStudyYear] = useState('');
  const [branch, setBranch] = useState('');
  const [section, setSection] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [authStatus, setAuthStatus] = useState<AuthStatus | null>(null);

  const { username, setUsername, status: usernameStatus } = useUsernameAvailability('');

  // ── Step 3: Email verification ───────────────────────────────────────────
  const [verifying, setVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState('');

  // ── Step 1: Validate invite code ─────────────────────────────────────────
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

        // Pre-fill academic fields from roster invite metadata
        const inviteData = res.data;
        if (inviteData?.branch)        setBranch(inviteData.branch);
        if (inviteData?.section)       setSection(inviteData.section);
        if (inviteData?.academic_year) setStudyYear(String(inviteData.academic_year));

        setRegisterStep(2);
        toast.success('Invite code verified! ✨');
      }
    } catch {
      setInviteError('Failed to validate invite code');
    } finally {
      setValidatingInvite(false);
    }
  };

  // ── Step 2: Submit registration form → trigger Clerk sign-up ─────────────
  const handleStudentRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoaded || !signUp) return;

    setIsLoading(true);
    setAuthStatus(null);

    if (!inviteValidated?.code) {
      setAuthStatus({ type: 'error', title: 'Invite required', message: 'Please validate an invite code first.' });
      setIsLoading(false);
      return;
    }

    const fullName = name.trim();
    const normalizedUsername = normalizeUsernameInput(username);

    if (!college) {
      toast.error('Please select your college.');
      setIsLoading(false);
      return;
    }
    if (!normalizedUsername) {
      toast.error('Please choose a username.');
      setIsLoading(false);
      return;
    }
    if (usernameStatus.state !== 'available') {
      toast.error(usernameStatus.message || 'Choose an available username.');
      setIsLoading(false);
      return;
    }

    const pwd = password || '';
    if (pwd.length < 8) {
      toast.error('Password must be at least 8 characters long.');
      setIsLoading(false);
      return;
    }
    if (!studyYear) { toast.error('Please select your year of study.'); setIsLoading(false); return; }
    if (!branch)    { toast.error('Please select your branch.');         setIsLoading(false); return; }

    try {
      const nameParts = fullName.split(' ');
      const firstName = nameParts[0] || fullName;
      const lastName  = nameParts.slice(1).join(' ') || '';

      await signUp.create({
        emailAddress: email,
        password,
        firstName,
        lastName,
        username: normalizedUsername,
        unsafeMetadata: {
          username: normalizedUsername,
          college,
          study_year: studyYear,
          branch,
          section: section || null,
          invite_code: inviteValidated.code,
          expected_roll_number: inviteValidated?.data?.expected_roll_number || null,
          role: 'student',
        },
      });

      // Trigger email verification (Clerk sends a 6-digit OTP)
      await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
      setRegisterStep(3);
    } catch (err: any) {
      const clerkError = err?.errors?.[0];
      const code = clerkError?.code || '';
      const msg  = clerkError?.longMessage || clerkError?.message || 'Registration failed.';

      if (code === 'form_identifier_exists') {
        setAuthStatus({ type: 'error', title: 'Email already registered', message: 'This email already has an account. Try signing in instead.' });
        toast.error('Email already registered — try signing in.');
      } else if (
        code === 'session_exists' || 
        code === 'identifier_already_signed_in' ||
        msg.toLowerCase().includes('already signing in') || 
        msg.toLowerCase().includes('already signed in') || 
        msg.toLowerCase().includes('sign in attempt in progress') ||
        msg.toLowerCase().includes('active session')
      ) {
        // Clerk throws this if there is a stale sign in attempt in the browser,
        // or if the account was deleted remotely but the browser still has a session cookie.
        // Aggressively clear local state to un-stick the user
        localStorage.clear();
        document.cookie.split(";").forEach((c) => {
          document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
        });
        if (typeof window !== 'undefined' && (window as any).Clerk) {
          try { await (window as any).Clerk.signOut(); } catch (e) {}
        }
        toast.error('Cleared a stuck session. Reloading...');
        setTimeout(() => window.location.reload(), 1500);
      } else {
        setAuthStatus({ type: 'error', title: 'Registration failed', message: msg });
        toast.error(msg);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // ── Step 3: Verify OTP → complete Clerk sign-up → create Supabase profile ──
  //
  // WHY WE CALL THE BACKEND HERE:
  // Supabase RLS policies check auth.uid(), which in our Clerk integration maps
  // the Clerk JWT sub ("user_2xyz...") to a UUID by querying the profiles table.
  // But at signup time the profile row doesn't exist yet → auth.uid() returns
  // NULL → all direct Supabase INSERT/UPDATE calls get a 403.
  // The backend /api/auth/complete-signup endpoint uses the service-role key
  // which bypasses RLS entirely, breaking this bootstrap chicken-and-egg cycle.
  const handleVerifyEmail = async (code: string) => {
    if (!isLoaded || !signUp) return;
    setVerifying(true);
    setVerifyError('');

    try {
      const result = await signUp.attemptEmailAddressVerification({ code });

      if (result.status !== 'complete') {
        console.log('Verification result status was not complete:', result);
        const missing = result.unverifiedFields?.join(', ') || result.missingFields?.join(', ') || '';
        setVerifyError(`Verification incomplete. Missing: ${missing}. Please try again.`);
        setVerifying(false);
        return;
      }

      // Activate Clerk session
      await setActive({ session: result.createdSessionId });

      const clerkUserId = result.createdUserId;
      const fullName    = name.trim();
      const normalizedUsername = normalizeUsernameInput(username);
      const inviteCode  = inviteValidated?.code;

      // ── Call the backend to create the profile + consume invite (bypasses RLS) ──
      // VITE_BACKEND_URL = http://localhost:3000 in dev (backend server base URL)
      // In production, the frontend is served from the same origin so we use relative /api
      const backendBase = import.meta.env.VITE_BACKEND_URL || '';
      const backendUrl = backendBase ? `${backendBase}/api` : '/api';
      const signupRes = await fetch(`${backendUrl}/auth/complete-signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clerkUserId,
          email,
          name:       fullName,
          username:   normalizedUsername,
          college,
          study_year: studyYear,
          branch,
          section:    section || null,
          role:       'student',
          inviteCode: inviteCode || null,
        }),
      });

      if (!signupRes.ok) {
        const errBody = await signupRes.json().catch(() => ({}));
        console.error('complete-signup error:', errBody);
        // Non-fatal: account is created in Clerk, profile will sync via webhook.
        toast.error(
          `Account created but profile setup encountered an issue. Please contact support if this persists. (${errBody?.error || signupRes.status})`
        );
      }

      toast.success('Welcome to Campus Blink! 🎉');
      navigate('/');
    } catch (err: any) {
      const clerkError = err?.errors?.[0];
      const code = clerkError?.code || '';
      const msg  = clerkError?.longMessage || clerkError?.message || 'Verification failed.';

      if (code === 'form_code_incorrect') {
        setVerifyError('Incorrect code. Please check your email and try again.');
      } else if (code === 'verification_expired') {
        setVerifyError('Code expired. Please request a new one.');
      } else {
        setVerifyError(msg);
      }
    } finally {
      setVerifying(false);
    }
  };

  const handleResendCode = async () => {
    if (!isLoaded || !signUp) return;
    try {
      await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
      toast.success('New verification code sent! Check your inbox.');
    } catch {
      toast.error('Could not resend code. Please wait a moment.');
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  if (isProfessor) {
    return <ProfessorRegisterPage onSwitchToStudent={() => setIsProfessor(false)} />;
  }

  // Step 3 — Email verification
  if (registerStep === 3) {
    return (
      <VerifyEmailScreen
        email={email}
        firstName={getFirstName(name, 'there')}
        onVerify={handleVerifyEmail}
        onResend={handleResendCode}
        verifying={verifying}
        verifyError={verifyError}
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
      
      {/* Required for Clerk Bot Protection in custom flows */}
      <div id="clerk-captcha"></div>

      {/* ── Step 1: Invite code ── */}
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
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  if (!validatingInvite && inviteInput.trim().length >= 3) handleValidateInvite();
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

          {inviteValidated?.inviter?.name && (
            <div className="rounded-lg border border-[#16A34A]/30 bg-[#16A34A]/10 px-4 py-3">
              <p className="font-sans text-sm font-bold text-[var(--text-primary)]">
                ✅ Invited by {getFirstName(inviteValidated.inviter.name, 'a friend')}
              </p>
            </div>
          )}

          {inviteError && (
            <div className="rounded-lg border border-[var(--error)]/30 bg-[var(--error)]/10 px-4 py-3">
              <p className="font-sans text-sm text-[#B42318] font-bold">{inviteError}</p>
            </div>
          )}

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

          <AuthSwitchLink question="Already have an account?" actionText="Log In" to="/login" />
        </div>
      ) : (
        /* ── Step 2: Registration form ── */
        <form onSubmit={handleStudentRegister} className="space-y-4 lg:space-y-3.5">
          {inviteValidated && (
            <div className="rounded-lg border border-[#16A34A]/30 bg-[#16A34A]/10 px-4 py-3 flex items-center justify-between gap-3">
              <p className="font-sans text-sm font-bold text-[var(--text-primary)]">
                ✅ Invited by {getFirstName(inviteValidated?.inviter?.name, 'a friend')}
              </p>
              <span className="text-xs font-bold text-accent-green uppercase tracking-[0.16em]">
                {inviteValidated.code}
              </span>
            </div>
          )}

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

          <UsernameFormField value={username} onChange={setUsername} status={usernameStatus} />

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

          <AuthSwitchLink question="Already have an account?" actionText="Log In" to="/login" />
        </form>
      )}
    </AuthScreenShell>
  );
};
