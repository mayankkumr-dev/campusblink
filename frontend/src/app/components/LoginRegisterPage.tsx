import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { useNavigate, Link, useLocation } from 'react-router';
import { Eye, EyeOff, Loader2, Mail, KeyRound, CheckCircle, X } from 'lucide-react';
import { checkUsernameAvailability, resetPassword, resendConfirmationEmail, signIn, signUp } from '../../api/auth';
import { useAuthStore } from '../../store/authStore';
import { getFirstName } from '../../lib/user';
import { formatInviteCodeInput, validateInviteCode } from '../../api/invites';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';
import { ThemeAwareLogo } from './ThemeAwareLogo';

const loginBannerBackground = '/banner-background.png';
const VERIFY_EMAIL_KEY = 'cb_pending_verification_email';
const VERIFY_NAME_KEY = 'cb_pending_verification_name';
const ONLY_COLLEGE = 'Maharaja Agrasen Institute of Technology (MAIT)';
export const MAIMS_COLLEGE = 'Maharaja Agrasen Institute of Management Studies (MAIMS)';

export const MAIT_BRANCHES = [
  'Computer Science and Engineering (CSE)',
  'Information Technology (IT)',
  'Electronics and Communication Engineering (ECE)',
  'Computer Science and Engineering AIML (CSE-AIML)',
  'Computer Science and Engineering DS (CSE DS)',
  'Computer Science and Engineering AI (CSE AI)',
  'Computer Science and Technology (CST)',
  'Computer Science and Engineering (AI)',
  'Electrical and Electronics Engineering (EEE)',
  'Mechanical Engineering (ME)',
  'Advanced Communication Technologies',
  'VLSI Design'
];
export const MAIMS_BRANCHES = ['BBA', 'MBA'];
export const STUDY_YEARS = [
  '1st Year: Freshman',
  '2nd Year: Sophomore',
  '3rd Year: Junior',
  '4th Year: Senior'
];

function normalizeUsernameInput(value: string) {
  return value.trim().replace(/^@+/, '').replace(/\s+/g, '').toLowerCase();
}

export const LoginRegisterPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const authUser = useAuthStore(state => state.user);
  const authLoading = useAuthStore(state => state.isLoading);
  const user = useAuthStore((state) => state.user);
  const profile = useAuthStore(state => state.profile);

  const initialTab = useMemo(() => (location.pathname === '/register' ? 'register' : 'login'), [location.pathname]);

  const [tab, setTab] = useState<'login' | 'register'>(initialTab);
  const [showPassword, setShowPassword] = useState(false);
  const [authStatus, setAuthStatus] = useState<{ type: 'error' | 'info' | 'success', title: string, message: string } | null>(null);

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [requestedRole, setRequestedRole] = useState<'student' | 'teacher'>('student');
  const [staffRoomNumber, setStaffRoomNumber] = useState('');
  const [college, setCollege] = useState(ONLY_COLLEGE);
  const [studyYear, setStudyYear] = useState('');
  const [branch, setBranch] = useState('');
  const [registerStep, setRegisterStep] = useState<1 | 2>(tab === 'register' ? 1 : 2);
  const [inviteInput, setInviteInput] = useState('');
  const [validatingInvite, setValidatingInvite] = useState(false);
  const [inviteError, setInviteError] = useState('');
  const [inviteShake, setInviteShake] = useState(false);
  const [inviteValidated, setInviteValidated] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showResendConfirmation, setShowResendConfirmation] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState<{
    state: 'idle' | 'checking' | 'available' | 'unavailable';
    message: string;
  }>({ state: 'idle', message: '' });

  // Verification states
  const [showPostSignupScreen, setShowPostSignupScreen] = useState(false);
  const [showProfessorPendingScreen, setShowProfessorPendingScreen] = useState(false);
  const [pendingVerification, setPendingVerification] = useState<{ email: string; firstName: string } | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [emailVerifiedBanner, setEmailVerifiedBanner] = useState(false);
  const [verifyingEmailLink, setVerifyingEmailLink] = useState(false);
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmailInput, setForgotEmailInput] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotSuccessEmail, setForgotSuccessEmail] = useState<string | null>(null);

  const setUser = useAuthStore(state => state.setUser);
  const setProfile = useAuthStore(state => state.setProfile);

  useEffect(() => {
    if (authLoading) return;
    if (authUser && profile) {
      const role = profile.role || 'student';
      if (role === 'admin') {
        navigate('/admin', { replace: true });
      } else if (role === 'professor') {
        const status = String(profile.professor_status || 'pending').toLowerCase();
        if (status === 'pending') navigate('/professor/pending', { replace: true });
        else if (status === 'rejected') navigate('/professor/rejected', { replace: true });
        else navigate('/professor/home', { replace: true });
      } else if (role === 'canteen_owner') {
        navigate('/canteen-dashboard', { replace: true });
      } else if (role === 'print_shop') {
        navigate('/print-dashboard', { replace: true });
      } else {
        navigate('/student/home', { replace: true });
      }
    }
  }, [authUser, profile, authLoading, navigate]);

  useEffect(() => {
    setTab(initialTab);
    setRegisterStep(initialTab === 'register' ? 1 : 2);
  }, [initialTab]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('reset') === 'success') {
      setAuthStatus({
        type: 'success',
        title: 'Password Reset Successful!',
        message: 'Your password has been changed. You can now sign in with your new password.',
      });
    }
  }, [location.search]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const id = window.setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => window.clearInterval(id);
  }, [resendCooldown]);

  useEffect(() => {
    if (tab !== 'register' || registerStep !== 2) {
      return;
    }

    const normalizedUsername = normalizeUsernameInput(username);

    if (!normalizedUsername) {
      setUsernameStatus({ state: 'idle', message: '' });
      return;
    }

    if (!/^[a-z0-9._]{3,20}$/.test(normalizedUsername)) {
      setUsernameStatus({ state: 'unavailable', message: 'Use 3-20 letters, numbers, dots, or underscores.' });
      return;
    }

    let cancelled = false;
    setUsernameStatus({ state: 'checking', message: 'Checking username...' });

    const timeoutId = window.setTimeout(async () => {
      const { data, error } = await checkUsernameAvailability(normalizedUsername);

      if (cancelled) {
        return;
      }

      if (error) {
        setUsernameStatus({ state: 'unavailable', message: 'Could not check username right now.' });
        return;
      }

      setUsername(normalizeUsernameInput(data?.normalizedUsername || normalizedUsername));
      setUsernameStatus({
        state: data?.available ? 'available' : 'unavailable',
        message: data?.message || '',
      });
    }, 350);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [registerStep, tab, username]);

  useEffect(() => {
    const savedEmail = localStorage.getItem(VERIFY_EMAIL_KEY) || '';
    const savedName = localStorage.getItem(VERIFY_NAME_KEY) || '';

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
        setTab('login');
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
        setTab('login');
        setTimeout(() => {
          const passwordEl = document.getElementById('login-password');
          if (passwordEl instanceof HTMLInputElement) passwordEl.focus();
        }, 50);

        if (window.location.hash) {
          window.history.replaceState({}, document.title, `${window.location.pathname}${window.location.search}`);
        }
      }

      if (!isEmailVerified && tab === 'login' && savedEmail && !email) {
        setEmail(savedEmail);
      }

      if (savedEmail && savedName) {
        setPendingVerification({ email: savedEmail, firstName: getFirstName(savedName, 'Student') });
      }
    };

    finalizeVerification();
  }, [location.search]);

  const switchTab = (nextTab: 'login' | 'register') => {
    setTab(nextTab);
    setRegisterStep(nextTab === 'register' ? 1 : 2);
    setAuthStatus(null);
    setShowResendConfirmation(false);
    setEmailVerifiedBanner(false);
    setPassword('');
    setUsername('');
    setUsernameStatus({ state: 'idle', message: '' });
    setInviteError('');
    setInviteValidated(null);
    setInviteInput('');
    setRequestedRole('student');
    setStaffRoomNumber('');
    setShowProfessorPendingScreen(false);
    if (nextTab === 'register') {
      navigate('/register');
    } else {
      navigate('/login');
    }
  };

  const handleValidateInvite = async () => {
    if (!inviteInput.trim()) {
      setInviteError('Please enter an invite code.');
      return;
    }

    setValidatingInvite(true);
    setInviteError('');
    setAuthStatus(null);

    const { data, error } = await validateInviteCode(inviteInput);

    if (error || !data) {
      setInviteValidated(null);
      setInviteShake(true);
      setTimeout(() => setInviteShake(false), 420);
      setInviteError('Invalid or expired invite code. Ask your friend for a valid code.');
      setValidatingInvite(false);
      return;
    }

    setInviteValidated(data);
    setInviteInput(data.code || inviteInput.toUpperCase());
    setAuthStatus({
      type: 'success',
      title: 'Valid invite code',
      message: '✅ Valid invite code!',
    });
    setRegisterStep(2);
    setValidatingInvite(false);
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setAuthStatus(null);

    if (tab === 'register') {
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

      if (requestedRole === 'teacher' && !staffRoomNumber.trim()) {
        setAuthStatus({
          type: 'error',
          title: 'Staff room required',
          message: 'Please enter your staff room number.',
        });
        toast.error('Please enter your staff room number.');
        setIsLoading(false);
        return;
      }

      // Password validation
      const pwd = password || '';
      if (pwd.length < 8 || !/[A-Z]/.test(pwd) || !/[a-z]/.test(pwd) || !/[0-9]/.test(pwd) || !/[!?@#$%^&*_\-]/.test(pwd)) {
        setAuthStatus({
          type: 'error',
          title: 'Weak password',
          message: 'Password must be at least 8 characters long and include an uppercase letter, a lowercase letter, a number, and a special character.',
        });
        toast.error('Password must be at least 8 characters with 1 uppercase, 1 lowercase, 1 number, and 1 special character.');
        setIsLoading(false);
        return;
      }

      if (requestedRole === 'student') {
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
      }

      const { error: signUpError } = await signUp(email, password, fullName, college, normalizedUsername, {
        code: inviteValidated.code,
      }, requestedRole, { staffRoomNumber: staffRoomNumber.trim() }, studyYear, branch);
      const error = signUpError;
      if (error) {
        const errorCode = (error as any)?.code || '';
        const errorMessage = (error && typeof error === 'object' && 'message' in error)
          ? String((error as { message?: string }).message)
          : 'We could not create your account right now.';

        // Already registered but unverified — go to the resend screen instead of showing error
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

        // Already confirmed — tell them to log in
        if (errorCode === 'ALREADY_REGISTERED') {
          switchTab('login');
          setAuthStatus({
            type: 'info',
            title: 'Account already exists',
            message: 'An account with this email already exists. Please log in.',
          });
          setIsLoading(false);
          return;
        }

        // Rate limit — show helpful guidance
        if (errorCode === 'EMAIL_RATE_LIMIT' || errorMessage.toLowerCase().includes('rate limit')) {
          setAuthStatus({
            type: 'info',
            title: 'Email limit reached',
            message: 'Supabase has a limit on verification emails. Please wait a few minutes and try again, or check your inbox for an earlier verification email.',
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
      return;
    }

    const { data, error } = await signIn(email, password);
    if (error) {
      const accountStatus = (error as any)?.accountStatus || '';
      const errorCode = (error as any)?.code || '';
      const restrictionReason = (error as any)?.reason || '';
      const message = (error && typeof error === 'object' && 'message' in error)
        ? String((error as { message?: string }).message)
        : 'Invalid credentials';
      const normalizedMessage = message.toLowerCase();

      if (errorCode === 'PROFESSOR_PENDING') {
        setAuthStatus({
          type: 'info',
          title: 'Application Under Review',
          message: 'Your professor account is pending admin approval. You will receive an email once your account is approved.',
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

      if (normalizedMessage.includes('verify your email') || normalizedMessage.includes('email not confirmed') || normalizedMessage.includes('email_not_confirmed')) {
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
      setAuthStatus({ type: 'error', title: 'Sign in failed', message: 'Unexpected authentication response.' });
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
    // Only show pending toast if auth metadata AND the DB profile both say pending
    // (avoids misleading toast when metadata is stale after admin approval)
    const pendingTeacherRequest =
      data.user?.user_metadata?.requested_role === 'teacher' &&
      String(data.user?.user_metadata?.role_request_status || '').toLowerCase() === 'pending' &&
      String(resolvedProfile?.professor_status || 'pending').toLowerCase() === 'pending';
    const isAdminEmail = resolvedEmail === 'contactus.mayank@gmail.com';
    const redirectState = typeof location.state === 'object' && location.state && 'from' in location.state
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
    }
    else if (role === 'canteen_owner') navigate('/canteen-dashboard');
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
        const { data, error: rpcError } = await supabase.rpc('get_email_by_username', { p_username: inputVal });
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

    const { error } = await resetPassword(targetEmail, `${window.location.origin}/auth/callback?type=recovery`);
    setForgotLoading(false);

    if (error) {
      const errorMessage = (error && typeof error === 'object' && 'message' in error)
        ? String((error as { message?: string }).message)
        : 'Failed to send reset email.';
      toast.error(errorMessage);
      return;
    }

    setForgotSuccessEmail(targetEmail);
    toast.success('Password reset email sent!');
  };

  const resendTargetEmail = showPostSignupScreen ? pendingVerification?.email : email;

  const handleResendConfirmation = async () => {
    if (!resendTargetEmail) {
      toast.error('Enter your email first.');
      return;
    }
    if (resendCooldown > 0) return;

    const { error } = await resendConfirmationEmail(resendTargetEmail, `${window.location.origin}/auth/callback?type=signup`);
    if (error) {
      const errorMessage = (error && typeof error === 'object' && 'message' in error)
        ? String((error as { message?: string }).message)
        : 'Failed to resend confirmation email.';

      const normalizedError = errorMessage.toLowerCase();
      if (normalizedError.includes('rate limit')) {
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
    if (!showPostSignupScreen) {
      setAuthStatus({
        type: 'info',
        title: 'Verification email sent',
        message: 'Check your inbox and spam folder, then open the confirmation link and try signing in again.',
      });
    }
    toast.success('Verification email resent! Check your inbox.');
  };

  if (showProfessorPendingScreen) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] p-3 md:p-4 flex text-[var(--text-primary)] font-sans overflow-hidden">
        <div className="flex-1 flex flex-col justify-between p-6 md:p-12 relative z-10">
          <div className="flex justify-center mb-8">
            <Link to="/" className="flex flex-col items-center justify-center drop-shadow-sm transition-transform hover:scale-105">
              <ThemeAwareLogo alt="Campus Blink" loading="eager" className="h-10 w-auto object-contain shrink-0" />
            </Link>
          </div>

          <div className="max-w-xl mx-auto w-full flex-1 flex flex-col items-center justify-center text-center py-8">
            <motion.div
              initial={{ y: 0 }}
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
              className="w-20 h-20 rounded-md bg-[#FEF9C3] border border-[#F59E0B]/50 flex items-center justify-center mb-6"
            >
              <span className="text-4xl">🕐</span>
            </motion.div>

            <h1 className="font-syne font-extrabold text-4xl md:text-5xl text-[var(--text-primary)] mb-4 leading-tight">
              Application Under Review
            </h1>
            <p className="font-sans text-[var(--text-secondary)] text-base md:text-lg max-w-lg leading-relaxed">
              Your professor account has been submitted for review.
              You will receive an email once your account is approved.
            </p>
            <p className="mt-4 font-sans text-[var(--text-secondary)] text-sm max-w-lg leading-relaxed">
              Please also check your inbox at <span className="font-bold text-[var(--text-primary)]">{pendingVerification?.email || email}</span> to verify your email address.
            </p>

            <div className="mt-8 w-full max-w-sm space-y-3">
              <button
                type="button"
                onClick={() => {
                  setShowProfessorPendingScreen(false);
                  switchTab('login');
                }}
                className="w-full rounded-lg border border-[var(--text-primary)]/20 bg-[var(--bg)] px-4 py-3 text-sm font-bold text-[var(--text-primary)] hover:bg-[var(--text-primary)]/5 transition-colors"
              >
                Go to Login
              </button>
            </div>

            <p className="mt-10 text-sm text-[var(--text-secondary)]">
              Approval usually takes 1-2 business days.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (showPostSignupScreen && pendingVerification) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] p-3 md:p-4 flex text-[var(--text-primary)] font-sans overflow-hidden">
        <div className="flex-1 flex flex-col justify-between p-6 md:p-12 relative z-10">
          <div className="flex justify-center mb-8">
            <Link to="/" className="flex flex-col items-center justify-center drop-shadow-sm transition-transform hover:scale-105">
              <ThemeAwareLogo alt="Campus Blink" loading="eager" className="h-10 w-auto object-contain shrink-0" />
            </Link>
          </div>

          <div className="max-w-xl mx-auto w-full flex-1 flex flex-col items-center justify-center text-center py-8">
            <motion.div
              initial={{ y: 0 }}
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
              className="w-20 h-20 rounded-md bg-[var(--yellow)]/25 border border-[var(--yellow)]/50 flex items-center justify-center mb-6"
            >
              <Mail className="w-10 h-10 text-[var(--text-primary)]" />
            </motion.div>

            <h1 className="font-syne font-extrabold text-4xl md:text-5xl text-[var(--text-primary)] mb-4 leading-tight">
              Check your inbox, {pendingVerification.firstName}! 📬
            </h1>
            <p className="font-sans text-[var(--text-secondary)] text-base md:text-lg max-w-lg leading-relaxed">
              We sent a verification link to <span className="font-bold text-[var(--text-primary)]">{pendingVerification.email}</span>.
              Click the link to activate your account.
            </p>

            <div className="mt-8 w-full max-w-sm space-y-3">
              <button
                type="button"
                onClick={handleResendConfirmation}
                disabled={resendCooldown > 0}
                className="w-full rounded-lg border border-[var(--text-primary)]/20 bg-[var(--bg)] px-4 py-3 text-sm font-bold text-[var(--text-primary)] hover:bg-[var(--text-primary)]/5 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {resendCooldown > 0 ? `Resend in ${resendCooldown}s...` : 'Resend verification email'}
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowPostSignupScreen(false);
                  switchTab('register');
                }}
                className="w-full text-sm font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              >
                Wrong email? Go back and try again
              </button>
            </div>

            <p className="mt-10 text-sm text-[var(--text-secondary)]">
              Check your spam folder if you do not see the email in 2 minutes.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen lg:h-screen bg-[linear-gradient(180deg,var(--bg-secondary)_0%,var(--bg-primary)_100%)] p-2 md:p-3 lg:p-4 flex text-[var(--text-primary)] font-sans overflow-hidden">
      <ThemeAwareLogo
        alt="Campus Blink"
        loading="lazy"
        width={800}
        height={800}
        style={{ objectFit: 'contain' }}
        className="fixed inset-0 w-full h-full opacity-[0.01] pointer-events-none mix-blend-screen scale-150 lg:hidden"
      />

      <div className="relative hidden md:flex md:w-[46%] lg:w-1/2 overflow-hidden rounded-[2rem] border border-black/10 bg-[linear-gradient(160deg,var(--yellow-light)_0%,#F4E7B4_45%,var(--yellow-light)_100%)] justify-center items-center">
        
        {/* Mascot Watermark */}
        <ThemeAwareLogo
          alt=""
          loading="lazy"
          className="absolute inset-0 m-auto w-[160%] h-[160%] opacity-[0.08] object-contain rotate-[-10deg] pointer-events-none"
        />
        
        {/* Logo anchor */}
        <div className="absolute left-8 top-8 z-20">
          <Link to={user ? '/student/home' : '/'} className="no-underline cursor-pointer">
            <ThemeAwareLogo alt="Campus Blink" className="h-10 w-auto object-contain" />
          </Link>
        </div>

        {/* Floating Cards Container */}
        <div className="absolute inset-0 z-10 w-full h-full pointer-events-none">
            {/* Card 1 - Top Left */}
            <motion.div
              animate={{ y: [0, -12, 0] }}
              transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
              className="absolute top-[20%] left-[8%] z-20 -rotate-3 p-4 rounded-xl bg-[var(--bg)]/75 backdrop-blur-md border border-black/10 shadow-[0_0_30px_rgba(255,214,0,0.12)] min-w-[220px]"
            >
               <div className="flex items-center justify-between gap-4 mb-2">
                <span className="text-[var(--text-primary)] font-syne font-medium text-[15px]">🍔 Vada Pav ordered!</span>
                  <span className="px-2 py-0.5 rounded-full bg-[#10B981]/20 text-[#10B981] text-[10px] font-bold tracking-wide">Ready</span>
               </div>
              <p className="text-[var(--text-primary)] text-[13px] font-sans">Ready at 1:00 PM slot</p>
            </motion.div>

            {/* Card 2 - Center Left */}
            <motion.div
              animate={{ y: [0, 15, 0] }}
              transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
              className="absolute top-[62%] left-[6%] z-30 rotate-2 p-4 rounded-xl bg-[var(--bg)]/80 backdrop-blur-md border border-black/10 shadow-[0_0_30px_rgba(255,214,0,0.14)] min-w-[220px]"
            >
               <div className="flex items-center justify-between gap-4 mb-2">
                <span className="text-[var(--text-primary)] font-syne font-medium text-[15px]">📚 HC Verma Physics</span>
                  <span className="px-2 py-0.5 rounded-full bg-[var(--yellow)]/20 text-[var(--yellow)] text-[10px] font-bold tracking-wide">₹180</span>
               </div>
              <p className="text-[var(--text-primary)] text-[13px] font-sans">Like New</p>
            </motion.div>
            
            {/* Card 3 - Bottom Right */}
            <motion.div
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
              className="absolute bottom-[20%] right-[8%] z-20 -rotate-1 p-4 rounded-xl bg-[var(--bg)]/75 backdrop-blur-md border border-black/10 shadow-[0_0_30px_rgba(255,214,0,0.12)] min-w-[220px]"
            >
               <div className="flex items-center gap-2 mb-2">
                <span className="text-[var(--text-primary)] font-syne font-medium text-[15px]">⭐ +20 Reputation</span>
               </div>
              <p className="text-[var(--text-primary)] text-[13px] font-sans">Friend joined via your invite!</p>
            </motion.div>

            {/* Card 4 - Top Right */}
            <motion.div
              animate={{ y: [0, 18, 0] }}
              transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut', delay: 1.5 }}
              className="absolute top-[18%] right-[5%] z-20 rotate-4 p-4 rounded-xl bg-[var(--bg)]/75 backdrop-blur-md border border-black/10 shadow-[0_0_30px_rgba(255,214,0,0.12)] min-w-[220px]"
            >
               <div className="flex items-center gap-2 mb-2">
                <span className="text-[var(--text-primary)] font-syne font-medium text-[15px]">💬 Anonymous confession</span>
               </div>
              <p className="text-[var(--text-primary)] text-[13px] font-sans">47 likes · 12 replies</p>
            </motion.div>
        </div>

        {/* Center Overlay Text */}
        <div className="relative z-10 flex flex-col items-center text-center -mt-8">
          <h2 className="font-syne font-extrabold text-[var(--text-primary)] text-[52px] leading-[1.1] tracking-[-1px] drop-shadow-[0_10px_35px_rgba(255,214,0,0.22)]">
                Stop waiting.<br />
                Start <span className="text-[var(--yellow)]">blinking.</span>
            </h2>
        </div>
      </div>

        <div className="flex-1 flex flex-col justify-between p-5 md:p-8 lg:px-9 lg:py-7 relative z-10 overflow-y-auto">
        <div className="flex justify-center mb-4 lg:mb-3">
          <Link to="/" className="flex flex-col items-center justify-center drop-shadow-sm transition-transform hover:scale-105">
            <ThemeAwareLogo alt="Campus Blink" loading="eager" className="h-9 w-auto object-contain shrink-0" />
          </Link>
        </div>

        <div className="max-w-md mx-auto w-full flex-1 flex flex-col justify-start py-6 lg:py-4 rounded-[28px] border border-black/10 bg-[var(--bg)]/95 px-6 shadow-[0_24px_60px_rgba(13,13,13,0.08)] backdrop-blur-md md:px-8 overflow-y-auto transition-all duration-300">
          <AnimatePresence mode="wait">
            <motion.div
              key={tab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
            >
              <div className="text-center mb-7 lg:mb-6">
                <h2 className="text-[2rem] lg:text-[2.2rem] font-syne font-bold text-[var(--text-primary)] mb-2">
                  {tab === 'login' ? 'Welcome Back' : registerStep === 1 ? 'You need an invite.' : 'Join Campus'}
                </h2>
                <p className="text-[var(--text-secondary)] font-sans text-sm lg:text-[13px]">
                  {tab === 'login'
                    ? 'Enter your email and password to access your account'
                    : registerStep === 1
                      ? 'Campus Blink is invite-only. Ask a friend for their invite code to join the community.'
                      : 'Takes 30 seconds. Start with 50 Reputation ⭐'}
                </p>
                {tab === 'register' && registerStep === 2 ? (
                  <p className="mt-2 text-xs font-bold uppercase tracking-[0.16em] text-[var(--yellow-dark)]">You received 50 Reputation Points as a welcome bonus!</p>
                ) : null}
              </div>

              {emailVerifiedBanner && (
                <div className="mb-5 rounded-lg border border-[var(--success)]/40 bg-[var(--success)]/10 px-4 py-3">
                  <p className="font-sans font-bold text-sm text-[var(--text-primary)]">✅ Email verified! You can now login.</p>
                </div>
              )}

              {verifyingEmailLink && (
                <div className="mb-5 rounded-lg border border-[var(--yellow)]/40 bg-[var(--yellow)]/10 px-4 py-3 flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-[var(--text-primary)]" />
                  <p className="font-sans font-bold text-sm text-[var(--text-primary)]">Verifying your email link...</p>
                </div>
              )}

              {tab === 'register' && registerStep === 1 ? (
                <div className="space-y-4">
                  <div className="text-center">
                    <div className="text-5xl mb-2">(^_~)</div>
                    <p className="font-sans text-sm text-[var(--text-secondary)]">Enter your invite code to continue</p>
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
                      className={`uppercase tracking-[0.18em] text-center font-bold ${inviteError ? 'border-[var(--error)] focus:border-[var(--error)] focus:ring-[var(--error)]/25' : inviteValidated ? 'border-[#16A34A] focus:border-[#16A34A] focus:ring-[#16A34A]/25' : ''}`}
                      required
                    />
                  </motion.div>

                  {inviteValidated?.inviter?.name ? (
                    <div className="rounded-lg border border-[#16A34A]/30 bg-[#16A34A]/10 px-4 py-3">
                      <p className="font-sans text-sm font-bold text-[var(--text-primary)]">✅ Invited by {getFirstName(inviteValidated.inviter.name, 'a friend')}</p>
                    </div>
                  ) : null}

                  {inviteError ? (
                    <div className="rounded-lg border border-[var(--error)]/30 bg-[var(--error)]/10 px-4 py-3">
                      <p className="font-sans text-sm text-[#B42318] font-bold">{inviteError}</p>
                    </div>
                  ) : null}

                  <Button
                    disabled={validatingInvite || inviteInput.length < 11}
                    type="button"
                    size="lg"
                    onClick={handleValidateInvite}
                    className="w-full bg-[var(--yellow)] text-[var(--text-primary)] font-bold hover:bg-[var(--text-primary)] hover:text-[var(--yellow)]"
                  >
                    {validatingInvite ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Continue'}
                  </Button>
                </div>
              ) : (
              <form onSubmit={handleAuth} className="space-y-4 lg:space-y-3.5">
                {tab === 'register' && inviteValidated ? (
                  <div className="rounded-lg border border-[#16A34A]/30 bg-[#16A34A]/10 px-4 py-3 flex items-center justify-between gap-3">
                    <p className="font-sans text-sm font-bold text-[var(--text-primary)]">
                      ✅ Invited by {getFirstName(inviteValidated?.inviter?.name, 'a friend')}
                    </p>
                    <span className="text-xs font-bold text-accent-green uppercase tracking-[0.16em]">{inviteValidated.code}</span>
                  </div>
                ) : null}
                {tab === 'register' && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="space-y-4"
                  >
                    <div>
                      <span className="text-sm font-medium ml-1">Full Name</span>
                      <Input
                        placeholder="What do your friends call you?"
                        type="text"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <span className="text-sm font-medium ml-1">Username</span>
                      <Input
                        placeholder="Choose a unique username"
                        type="text"
                        value={username}
                        onChange={e => setUsername(normalizeUsernameInput(e.target.value))}
                        required={tab === 'register'}
                        autoCapitalize="none"
                        autoCorrect="off"
                        spellCheck={false}
                        className={usernameStatus.state === 'available'
                          ? 'border-[#16A34A] focus:border-[#16A34A] focus:ring-[#16A34A]/25'
                          : usernameStatus.state === 'unavailable'
                            ? 'border-[var(--error)] focus:border-[var(--error)] focus:ring-[var(--error)]/25'
                            : ''}
                      />
                      <p className="mt-2 text-xs font-medium text-[var(--text-secondary)]">Only lowercase letters, numbers, dots, and underscores. 3-20 characters.</p>
                      {usernameStatus.state !== 'idle' ? (
                        <p className={`mt-1 text-xs font-bold ${usernameStatus.state === 'available' ? 'text-accent-green' : usernameStatus.state === 'checking' ? 'text-[var(--text-secondary)]' : 'text-[#B42318]'}`}>
                          {usernameStatus.message}
                        </p>
                      ) : null}
                    </div>
                    <div>
                      <span className="text-sm font-medium ml-1">College Name</span>
                      <select
                        value={college}
                        onChange={(e) => {
                          setCollege(e.target.value);
                          setBranch('');
                          setStudyYear('');
                        }}
                        required
                        className="w-full h-12 rounded-lg border border-[var(--border)] transition-all appearance-none bg-[linear-gradient(45deg,transparent_50%,var(--text-primary)_50%),linear-gradient(135deg,var(--text-primary)_50%,transparent_50%)] bg-[position:calc(100%-18px)_22px,calc(100%-12px)_22px] bg-[size:6px_6px,6px_6px] bg-no-repeat pl-3 pr-8"
                      >
                        <option value={ONLY_COLLEGE}>{ONLY_COLLEGE}</option>
                        <option value={MAIMS_COLLEGE}>{MAIMS_COLLEGE}</option>
                      </select>
                    </div>

                    <div className="mt-4 flex flex-col items-start gap-1">
                      <span className="text-sm font-medium ml-1">Signing up as</span>
                      <div className="mt-2 grid w-full grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setRequestedRole('student')}
                          className={`rounded-lg border px-3 py-2 text-sm font-bold transition-colors ${requestedRole === 'student' ? 'border-[var(--yellow)] bg-[var(--yellow)]/15 text-[var(--text-primary)]' : 'border-black/10 bg-[var(--bg)] text-[var(--text-secondary)]'}`}
                        >
                          Student
                        </button>
                        <button
                          type="button"
                          onClick={() => setRequestedRole('teacher')}
                          className={`rounded-lg border px-3 py-2 text-sm font-bold transition-colors ${requestedRole === 'teacher' ? 'border-[var(--yellow)] bg-[var(--yellow)]/15 text-[var(--text-primary)]' : 'border-black/10 bg-[var(--bg)] text-[var(--text-secondary)]'}`}
                        >
                          Professor
                        </button>
                      </div>
                      {requestedRole === 'teacher' ? (
                        <>
                          <p className="mt-2 text-xs font-medium text-[var(--text-secondary)]">
                            Professor accounts will be submitted for admin approval after signup.
                          </p>
                          <div className="mt-3">
                            <span className="text-sm font-medium ml-1">Staff Room Number *</span>
                            <Input
                              placeholder="e.g. A-201"
                              type="text"
                              value={staffRoomNumber}
                              onChange={e => setStaffRoomNumber(e.target.value)}
                              required
                            />
                            <p className="mt-1 text-xs font-medium text-[var(--text-secondary)]">Your staff room / cabin number for delivery orders.</p>
                          </div>
                        </>
                      ) : null}
                    </div>

                    {requestedRole === 'student' && (
                      <div className="mt-4 grid grid-cols-2 gap-4 text-left">
                        <div>
                          <span className="text-sm font-medium ml-1">Year of Study</span>
                          <select
                            value={studyYear}
                            onChange={(e) => setStudyYear(e.target.value)}
                            required
                            className="w-full mt-1 h-12 rounded-lg border border-[var(--border)] transition-all appearance-none bg-[linear-gradient(45deg,transparent_50%,var(--text-primary)_50%),linear-gradient(135deg,var(--text-primary)_50%,transparent_50%)] bg-[position:calc(100%-18px)_22px,calc(100%-12px)_22px] bg-[size:6px_6px,6px_6px] bg-[var(--bg)] bg-no-repeat pl-3 pr-8 text-[var(--text)]"
                          >
                            <option value="" disabled>Select Year</option>
                            {STUDY_YEARS.map(y => <option key={y} value={y.split(':')[0]}>{y}</option>)}
                          </select>
                        </div>
                        <div>
                          <span className="text-sm font-medium ml-1">Branch</span>
                          <select
                            value={branch}
                            onChange={(e) => setBranch(e.target.value)}
                            required
                            className="w-full mt-1 h-12 rounded-lg border border-[var(--border)] transition-all appearance-none bg-[linear-gradient(45deg,transparent_50%,var(--text-primary)_50%),linear-gradient(135deg,var(--text-primary)_50%,transparent_50%)] bg-[position:calc(100%-18px)_22px,calc(100%-12px)_22px] bg-[size:6px_6px,6px_6px] bg-[var(--bg)] bg-no-repeat pl-3 pr-8 text-[var(--text)]"
                          >
                            <option value="" disabled>Select Branch</option>
                            {(college === MAIMS_COLLEGE ? MAIMS_BRANCHES : MAIT_BRANCHES).map(b => (
                              <option key={b} value={b}>{b}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}

                <div>
                  <span className="text-sm font-medium ml-1">{tab === 'login' ? 'Email or Username' : 'Email'}</span>
                  <Input
                    placeholder={tab === 'login' ? 'Enter email or username' : 'Enter your college email'}
                    type={tab === 'login' ? 'text' : 'email'}
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                  />
                </div>

                <div className="relative">
                  <span className="text-sm font-medium ml-1">Password</span>
                  <Input
                    id="login-password"
                    placeholder="Enter your password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    className="pr-12"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 bottom-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>

                {tab === 'login' && (
                  <div className="flex items-center justify-between pt-2">
                    <label className="flex items-center gap-2 cursor-pointer group">
                      <input
                        type="checkbox"
                        className="w-4 h-4 rounded border-black/20 bg-[var(--bg)] text-[var(--yellow)] focus:ring-1 focus:ring-[var(--yellow)] focus:ring-offset-0 focus:ring-offset-transparent cursor-pointer transition-colors accent-[var(--yellow)]"
                      />
                      <span className="text-sm text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] transition-colors">Remember me</span>
                    </label>
                    <button type="button" onClick={handleForgotPassword} className="text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--yellow)] transition-colors">
                      Forgot Password?
                    </button>
                  </div>
                )}

                {authStatus && (
                  <div
                    className={`rounded-lg border px-4 py-3 ${
                      authStatus.type === 'error'
                        ? 'border-[var(--error)]/30 bg-[var(--error)]/10'
                        : authStatus.type === 'success'
                          ? 'border-[var(--success)]/30 bg-[var(--success)]/10'
                          : 'border-[var(--yellow)]/40 bg-[var(--yellow)]/10'
                    }`}
                  >
                    <p className="font-sans font-bold text-sm text-[var(--text-primary)]">{authStatus.title}</p>
                    <p className="font-sans text-sm text-[var(--text-secondary)] mt-1">{authStatus.message}</p>
                  </div>
                )}

                {tab === 'login' && showResendConfirmation && (
                  <button
                    type="button"
                    onClick={handleResendConfirmation}
                    disabled={resendCooldown > 0}
                    className="w-full rounded-lg border border-[var(--yellow)]/40 bg-[var(--yellow)]/10 px-4 py-3 text-sm font-bold text-[var(--text-primary)] hover:bg-[var(--yellow)]/20 transition-colors disabled:opacity-60"
                  >
                    {resendCooldown > 0 ? `Resend in ${resendCooldown}s...` : 'Resend Verification Email'}
                  </button>
                )}

                <div className="pt-4 space-y-3">
                  <Button disabled={isLoading || (tab === 'register' && usernameStatus.state !== 'available')} type="submit" size="lg" className="w-full bg-[var(--text-primary)] text-white font-bold hover:bg-[var(--yellow)] hover:text-[var(--text-primary)]">
                    {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : (tab === 'login' ? 'Sign In' : 'Create Account')}
                  </Button>

                  {tab === 'login' && (
                    <Button
                      disabled={isLoading}
                      type="button"
                      variant="ghost"
                      size="lg"
                      className="w-full border border-[var(--text-primary)] text-[var(--text-primary)] hover:bg-[var(--text-primary)] hover:text-white flex items-center justify-center gap-3 font-sans font-medium capitalize-none normal-case tracking-normal"
                    >
                      <svg className="w-5 h-5" viewBox="0 0 24 24">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                      </svg>
                      Sign In with Google
                    </Button>
                  )}
                </div>
              </form>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="text-center mt-auto pt-4 pb-1 lg:pt-3 lg:pb-0">
          <p className="text-sm text-[var(--text-secondary)] font-sans">
            {tab === 'login' ? "Don't have an account? " : 'Already have an account? '}
            <button
              onClick={() => switchTab(tab === 'login' ? 'register' : 'login')}
              className="font-bold text-[var(--text-primary)] hover:text-[var(--yellow)] transition-colors"
            >
              {tab === 'login' ? 'Sign Up' : 'Log In'}
            </button>
          </p>
        </div>
      </div>

      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-2xl shadow-2xl max-w-md w-full p-6 relative overflow-hidden">
            <button
              onClick={() => setShowForgotModal(false)}
              className="absolute top-4 right-4 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors p-1"
            >
              <X className="w-5 h-5" />
            </button>

            {forgotSuccessEmail ? (
              <div className="text-center py-4 space-y-4">
                <div className="mx-auto w-14 h-14 rounded-full bg-green-500/15 border border-green-500/30 flex items-center justify-center text-accent-green">
                  <CheckCircle className="w-7 h-7" />
                </div>
                <h3 className="font-syne text-xl font-bold text-[var(--text-primary)]">
                  Check Your Email!
                </h3>
                <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                  We've sent a password reset link to <span className="font-semibold text-[var(--text-primary)]">{forgotSuccessEmail}</span>. Click the link in your email to set a new password.
                </p>
                <button
                  type="button"
                  onClick={() => setShowForgotModal(false)}
                  className="w-full py-3 px-4 rounded-xl bg-[var(--yellow)] text-[var(--text-primary)] font-syne font-bold text-sm shadow hover:opacity-95 transition-all mt-2"
                >
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={handleForgotSubmit} className="space-y-5">
                <div className="text-center">
                  <div className="mx-auto w-12 h-12 rounded-xl bg-[var(--yellow)]/15 border border-[var(--yellow)]/30 flex items-center justify-center text-[var(--yellow)] mb-3">
                    <KeyRound className="w-6 h-6" />
                  </div>
                  <h3 className="font-syne text-xl font-bold text-[var(--text-primary)]">
                    Reset Your Password
                  </h3>
                  <p className="mt-1 text-xs text-[var(--text-secondary)] leading-relaxed">
                    Enter your registered email address or username below and we'll send you a link to reset your password.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-1.5">
                    Email Address or Username
                  </label>
                  <input
                    type="text"
                    required
                    value={forgotEmailInput}
                    onChange={(e) => setForgotEmailInput(e.target.value)}
                    placeholder="student@example.edu or username"
                    className="block w-full px-4 py-3 rounded-xl bg-[var(--bg-primary)] border border-[var(--border)] text-[var(--text-primary)] placeholder-[var(--text-muted)] text-sm focus:outline-none focus:border-[var(--yellow)] focus:ring-1 focus:ring-[var(--yellow)] transition-all"
                  />
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowForgotModal(false)}
                    className="flex-1 py-3 px-4 rounded-xl bg-[var(--bg-primary)] border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] font-bold text-sm transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={forgotLoading}
                    className="flex-1 py-3 px-4 rounded-xl bg-[var(--yellow)] text-[var(--text-primary)] font-syne font-bold text-sm shadow hover:opacity-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {forgotLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      'Send Reset Link'
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
