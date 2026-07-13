import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Link } from 'react-router';
import { Eye, EyeOff, Loader2, Mail, KeyRound, CheckCircle, X } from 'lucide-react';
import { Input } from '../../app/components/ui/input';
import { Button } from '../../app/components/ui/button';
import { Logo } from '../../app/components/ui/Logo';
import { checkUsernameAvailability } from '../../api/auth';

export const loginBannerBackground = '/banner-background.png';
export const VERIFY_EMAIL_KEY = 'cb_pending_verification_email';
export const VERIFY_NAME_KEY = 'cb_pending_verification_name';
export const ONLY_COLLEGE = 'Maharaja Agrasen Institute of Technology (MAIT)';
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

export function normalizeUsernameInput(value: string): string {
  return value.trim().replace(/^@+/, '').replace(/\s+/g, '').toLowerCase();
}

export interface AuthStatus {
  type: 'error' | 'info' | 'success';
  title: string;
  message: string;
}

export interface UsernameStatus {
  state: 'idle' | 'checking' | 'available' | 'unavailable';
  message: string;
}

export function useUsernameAvailability(rawUsername: string, enabled = true) {
  const [username, setUsername] = useState(rawUsername);
  const [status, setStatus] = useState<UsernameStatus>({ state: 'idle', message: '' });

  useEffect(() => {
    if (!enabled) return;
    const normalizedUsername = normalizeUsernameInput(username);

    if (!normalizedUsername) {
      setStatus({ state: 'idle', message: '' });
      return;
    }

    if (!/^[a-z0-9._]{3,20}$/.test(normalizedUsername)) {
      setStatus({ state: 'unavailable', message: 'Use 3-20 letters, numbers, dots, or underscores.' });
      return;
    }

    let cancelled = false;
    setStatus({ state: 'checking', message: 'Checking username...' });

    const timeoutId = window.setTimeout(async () => {
      const { data, error } = await checkUsernameAvailability(normalizedUsername);
      if (cancelled) return;

      if (error) {
        setStatus({ state: 'unavailable', message: 'Could not check username right now.' });
        return;
      }

      setUsername(normalizeUsernameInput(data?.normalizedUsername || normalizedUsername));
      setStatus({
        state: data?.available ? 'available' : 'unavailable',
        message: data?.message || '',
      });
    }, 350);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [username, enabled]);

  return { username, setUsername, status, setStatus };
}

export const AuthScreenShell: React.FC<{
  children: React.ReactNode;
  user?: any;
}> = ({ children, user }) => {
  return (
    <div className="min-h-screen lg:h-screen bg-[linear-gradient(180deg,var(--bg-secondary)_0%,var(--bg-primary)_100%)] p-2 md:p-3 lg:p-4 flex text-[var(--text-primary)] font-sans overflow-hidden">
      <Logo
        alt="Campus Blink"
        loading="lazy"
        width={800}
        height={800}
        style={{ objectFit: 'contain' }}
        className="fixed inset-0 w-full h-full opacity-[0.01] pointer-events-none mix-blend-screen scale-150 lg:hidden"
      />

      <div className="relative hidden md:flex md:w-[46%] lg:w-1/2 overflow-hidden rounded-[2rem] border border-black/10 bg-[linear-gradient(160deg,var(--yellow-light)_0%,#F4E7B4_45%,var(--yellow-light)_100%)] justify-center items-center">
        {/* Mascot Watermark */}
        <Logo
          alt=""
          loading="lazy"
          className="absolute inset-0 m-auto w-[160%] h-[160%] opacity-[0.08] object-contain rotate-[-10deg] pointer-events-none"
        />

        {/* Logo anchor */}
        <div className="absolute left-8 top-8 z-20">
          <Link to={user ? '/student/home' : '/'} className="no-underline cursor-pointer">
            <Logo alt="Campus Blink" className="h-10 w-auto object-contain" />
          </Link>
        </div>

        {/* Floating Cards Container */}
        <div className="absolute inset-0 z-10 w-full h-full pointer-events-none">
          <motion.div
            initial={{ opacity: 0, y: -20, rotate: -4 }}
            animate={{ opacity: 1, y: 0, rotate: -4 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="absolute top-[22%] left-[10%] w-[320px] rounded-2xl border border-black/10 bg-[var(--card)]/90 backdrop-blur-md p-4 shadow-xl pointer-events-auto"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[var(--yellow)]/20 flex items-center justify-center text-lg">🍔</div>
              <div>
                <p className="font-bold text-sm text-[var(--text-primary)]">Skip the Canteen Line</p>
                <p className="text-xs text-[var(--text-secondary)]">Pre-order food & track live status</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20, rotate: 3 }}
            animate={{ opacity: 1, x: 0, rotate: 3 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="absolute top-[48%] right-[8%] w-[340px] rounded-2xl border border-black/10 bg-[var(--card)]/90 backdrop-blur-md p-4 shadow-xl pointer-events-auto"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[var(--yellow)]/20 flex items-center justify-center text-lg">🖨️</div>
              <div>
                <p className="font-bold text-sm text-[var(--text-primary)]">Cloud Print Shop</p>
                <p className="text-xs text-[var(--text-secondary)]">Upload notes & pick up printed docs</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20, rotate: -2 }}
            animate={{ opacity: 1, y: 0, rotate: -2 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="absolute bottom-[16%] left-[15%] w-[300px] rounded-2xl border border-black/10 bg-[var(--card)]/90 backdrop-blur-md p-4 shadow-xl pointer-events-auto"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[var(--yellow)]/20 flex items-center justify-center text-lg">💬</div>
              <div>
                <p className="font-bold text-sm text-[var(--text-primary)]">Campus Community</p>
                <p className="text-xs text-[var(--text-secondary)]">Verified students only. Real talk.</p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      <div className="w-full md:w-[54%] lg:w-1/2 flex flex-col justify-center items-center p-3 sm:p-6 md:p-10 relative z-10 overflow-y-auto">
        <div className="w-full max-w-[420px] mx-auto">
          <div className="flex justify-between items-center mb-6 md:hidden">
            <Link to="/" className="no-underline cursor-pointer">
              <Logo alt="Campus Blink" className="h-8 w-auto object-contain" />
            </Link>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
};

export const AuthHeader: React.FC<{
  title: string;
  subtitle: string;
}> = ({ title, subtitle }) => {
  return (
    <div className="mb-6 text-center lg:text-left">
      <h1 className="font-syne font-extrabold text-2xl sm:text-3xl lg:text-4xl text-[var(--text-primary)] tracking-tight">
        {title}
      </h1>
      <p className="font-sans text-sm sm:text-base text-[var(--text-secondary)] mt-1.5">
        {subtitle}
      </p>
    </div>
  );
};

export const AuthStatusBanner: React.FC<{
  status: AuthStatus | null;
}> = ({ status }) => {
  if (!status) return null;
  const isErr = status.type === 'error';
  const isSuccess = status.type === 'success';

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`mb-5 rounded-lg border px-4 py-3 font-sans ${
        isErr
          ? 'border-[var(--error)]/30 bg-[var(--error)]/10 text-[#B42318]'
          : isSuccess
            ? 'border-[#16A34A]/30 bg-[#16A34A]/10 text-[var(--text-primary)]'
            : 'border-[var(--yellow)]/40 bg-[var(--yellow)]/15 text-[var(--text-primary)]'
      }`}
    >
      <p className="font-bold text-sm">{status.title}</p>
      <p className="text-xs mt-0.5 opacity-90 leading-relaxed">{status.message}</p>
    </motion.div>
  );
};

export const EmailVerifiedBanner: React.FC<{
  show: boolean;
}> = ({ show }) => {
  if (!show) return null;
  return (
    <div className="mb-5 rounded-lg border border-[#16A34A]/30 bg-[#16A34A]/10 px-4 py-3 flex items-center gap-2">
      <span className="text-base">🎉</span>
      <p className="font-sans font-bold text-sm text-[var(--text-primary)]">Email verified! Please sign in below.</p>
    </div>
  );
};

export const ResendConfirmationBanner: React.FC<{
  show: boolean;
  resendCooldown: number;
  onResend: () => void;
}> = ({ show, resendCooldown, onResend }) => {
  if (!show) return null;
  return (
    <div className="mb-5 rounded-lg border border-[var(--yellow)]/40 bg-[var(--yellow)]/15 px-4 py-3 flex flex-col gap-2">
      <p className="font-sans text-xs sm:text-sm text-[var(--text-primary)]">
        Haven&apos;t received the confirmation link? Check spam or request a new email below.
      </p>
      <div>
        <button
          type="button"
          onClick={onResend}
          disabled={resendCooldown > 0}
          className="font-sans font-bold text-xs uppercase tracking-wider text-[var(--text-primary)] underline hover:text-[var(--yellow)] disabled:opacity-50"
        >
          {resendCooldown > 0 ? `Resend available in ${resendCooldown}s` : 'Resend confirmation link'}
        </button>
      </div>
    </div>
  );
};

export const PasswordFormField: React.FC<{
  label?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  id?: string;
  forgotPasswordAction?: () => void;
}> = ({
  label = 'Password',
  value,
  onChange,
  placeholder = 'Enter your password',
  required = true,
  id = 'auth-password',
  forgotPasswordAction,
}) => {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm font-medium ml-1">{label}</span>
        {forgotPasswordAction && (
          <button
            type="button"
            onClick={forgotPasswordAction}
            className="text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--yellow)] transition-colors"
          >
            Forgot Password?
          </button>
        )}
      </div>
      <div className="relative">
        <Input
          id={id}
          placeholder={placeholder}
          type={showPassword ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required={required}
          className="pr-10"
        />
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
        >
          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
};

export const UsernameFormField: React.FC<{
  value: string;
  onChange: (val: string) => void;
  status: UsernameStatus;
}> = ({ value, onChange, status }) => {
  return (
    <div>
      <span className="text-sm font-medium ml-1">Username</span>
      <Input
        placeholder="Choose a unique username"
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        className={
          status.state === 'available'
            ? 'border-[#16A34A] focus:border-[#16A34A] focus:ring-[#16A34A]/25'
            : status.state === 'unavailable'
              ? 'border-[var(--error)] focus:border-[var(--error)] focus:ring-[var(--error)]/25'
              : ''
        }
      />
      <p className="mt-1.5 text-xs font-medium text-[var(--text-secondary)]">
        Only lowercase letters, numbers, dots, and underscores. 3-20 characters.
      </p>
      {status.state !== 'idle' ? (
        <p
          className={`mt-1 text-xs font-bold ${
            status.state === 'available'
              ? 'text-accent-green'
              : status.state === 'checking'
                ? 'text-[var(--text-secondary)]'
                : 'text-[#B42318]'
          }`}
        >
          {status.message}
        </p>
      ) : null}
    </div>
  );
};

export const CollegeSelectField: React.FC<{
  value: string;
  onChange: (val: string) => void;
}> = ({ value, onChange }) => {
  return (
    <div>
      <span className="text-sm font-medium ml-1">College Name</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required
        className="w-full mt-1 h-12 rounded-lg border border-[var(--border)] transition-all appearance-none bg-[linear-gradient(45deg,transparent_50%,var(--text-primary)_50%),linear-gradient(135deg,var(--text-primary)_50%,transparent_50%)] bg-[position:calc(100%-18px)_22px,calc(100%-12px)_22px] bg-[size:6px_6px,6px_6px] bg-[var(--bg)] bg-no-repeat pl-3 pr-8 text-[var(--text)]"
      >
        <option value={ONLY_COLLEGE}>{ONLY_COLLEGE}</option>
        <option value={MAIMS_COLLEGE}>{MAIMS_COLLEGE}</option>
      </select>
    </div>
  );
};

export const StudentAcademicFields: React.FC<{
  college: string;
  studyYear: string;
  onStudyYearChange: (val: string) => void;
  branch: string;
  onBranchChange: (val: string) => void;
}> = ({ college, studyYear, onStudyYearChange, branch, onBranchChange }) => {
  const branchList = college === MAIMS_COLLEGE ? MAIMS_BRANCHES : MAIT_BRANCHES;

  return (
    <div className="mt-4 grid grid-cols-2 gap-4 text-left">
      <div>
        <span className="text-sm font-medium ml-1">Year of Study</span>
        <select
          value={studyYear}
          onChange={(e) => onStudyYearChange(e.target.value)}
          required
          className="w-full mt-1 h-12 rounded-lg border border-[var(--border)] transition-all appearance-none bg-[linear-gradient(45deg,transparent_50%,var(--text-primary)_50%),linear-gradient(135deg,var(--text-primary)_50%,transparent_50%)] bg-[position:calc(100%-18px)_22px,calc(100%-12px)_22px] bg-[size:6px_6px,6px_6px] bg-[var(--bg)] bg-no-repeat pl-3 pr-8 text-[var(--text)]"
        >
          <option value="" disabled>
            Select Year
          </option>
          {STUDY_YEARS.map((y) => (
            <option key={y} value={y.split(':')[0]}>
              {y}
            </option>
          ))}
        </select>
      </div>
      <div>
        <span className="text-sm font-medium ml-1">Branch</span>
        <select
          value={branch}
          onChange={(e) => onBranchChange(e.target.value)}
          required
          className="w-full mt-1 h-12 rounded-lg border border-[var(--border)] transition-all appearance-none bg-[linear-gradient(45deg,transparent_50%,var(--text-primary)_50%),linear-gradient(135deg,var(--text-primary)_50%,transparent_50%)] bg-[position:calc(100%-18px)_22px,calc(100%-12px)_22px] bg-[size:6px_6px,6px_6px] bg-[var(--bg)] bg-no-repeat pl-3 pr-8 text-[var(--text)]"
        >
          <option value="" disabled>
            Select Branch
          </option>
          {branchList.map((b) => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};

export const AuthSubmitButton: React.FC<{
  loading: boolean;
  disabled?: boolean;
  text: string;
}> = ({ loading, disabled, text }) => {
  return (
    <Button
      disabled={loading || disabled}
      type="submit"
      size="lg"
      className="w-full bg-[var(--text-primary)] text-white font-bold hover:bg-[var(--yellow)] hover:text-[var(--text-primary)] mt-6"
    >
      {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : text}
    </Button>
  );
};

export const AuthSwitchLink: React.FC<{
  question: string;
  actionText: string;
  to: string;
}> = ({ question, actionText, to }) => {
  return (
    <div className="mt-6 text-center">
      <p className="font-sans text-sm text-[var(--text-secondary)]">
        {question}{' '}
        <Link
          to={to}
          className="font-bold text-[var(--text-primary)] hover:text-[var(--yellow)] transition-colors"
        >
          {actionText}
        </Link>
      </p>
    </div>
  );
};

export const ForgotPasswordModal: React.FC<{
  show: boolean;
  onClose: () => void;
  emailInput: string;
  onEmailInputChange: (val: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  loading: boolean;
  successEmail: string | null;
}> = ({ show, onClose, emailInput, onEmailInputChange, onSubmit, loading, successEmail }) => {
  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="w-full max-w-md rounded-2xl bg-[var(--bg)] p-6 shadow-2xl border border-[var(--border)] relative"
      >
        <button
          onClick={onClose}
          type="button"
          className="absolute right-4 top-4 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
        >
          <X className="w-5 h-5" />
        </button>

        <h3 className="font-syne font-bold text-xl text-[var(--text-primary)] mb-2">Reset Password</h3>
        <p className="font-sans text-sm text-[var(--text-secondary)] mb-4">
          Enter your registered college email or username and we will send you a password reset link.
        </p>

        {successEmail ? (
          <div className="rounded-lg bg-[#16A34A]/10 border border-[#16A34A]/30 p-4 mb-4 text-center">
            <CheckCircle className="w-8 h-8 text-[#16A34A] mx-auto mb-2" />
            <p className="font-bold text-sm text-[var(--text-primary)]">Reset email sent!</p>
            <p className="text-xs text-[var(--text-secondary)] mt-1">
              We sent a password recovery link to <span className="font-bold">{successEmail}</span>. Check your inbox and spam folder.
            </p>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <span className="text-sm font-medium ml-1">Email or Username</span>
              <Input
                type="text"
                value={emailInput}
                onChange={(e) => onEmailInputChange(e.target.value)}
                placeholder="Enter college email or username"
                required
              />
            </div>
            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-[var(--text-primary)] text-white font-bold hover:bg-[var(--yellow)] hover:text-[var(--text-primary)]"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Send Reset Link'}
            </Button>
          </form>
        )}
      </motion.div>
    </div>
  );
};

export const ProfessorPendingScreen: React.FC<{
  email: string;
  onGoLogin: () => void;
}> = ({ email, onGoLogin }) => {
  return (
    <div className="min-h-screen bg-[var(--bg-primary)] p-3 md:p-4 flex text-[var(--text-primary)] font-sans overflow-hidden">
      <div className="flex-1 flex flex-col justify-between p-6 md:p-12 relative z-10">
        <div className="flex justify-center mb-8">
          <Link to="/" className="flex flex-col items-center justify-center drop-shadow-sm transition-transform hover:scale-105">
            <Logo alt="Campus Blink" loading="eager" className="h-10 w-auto object-contain shrink-0" />
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
            Please also check your inbox at <span className="font-bold text-[var(--text-primary)]">{email}</span> to verify your email address.
          </p>

          <div className="mt-8 w-full max-w-sm space-y-3">
            <button
              type="button"
              onClick={onGoLogin}
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
};

export const PostSignupVerificationScreen: React.FC<{
  pendingVerification: { email: string; firstName: string };
  resendCooldown: number;
  onResend: () => void;
}> = ({ pendingVerification, resendCooldown, onResend }) => {
  return (
    <div className="min-h-screen bg-[var(--bg-primary)] p-3 md:p-4 flex text-[var(--text-primary)] font-sans overflow-hidden">
      <div className="flex-1 flex flex-col justify-between p-6 md:p-12 relative z-10">
        <div className="flex justify-center mb-8">
          <Link to="/" className="flex flex-col items-center justify-center drop-shadow-sm transition-transform hover:scale-105">
            <Logo alt="Campus Blink" loading="eager" className="h-10 w-auto object-contain shrink-0" />
          </Link>
        </div>

        <div className="max-w-xl mx-auto w-full flex-1 flex flex-col items-center justify-center text-center py-8">
          <motion.div
            initial={{ y: 0 }}
            animate={{ y: [0, -8, 0] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
            className="w-20 h-20 rounded-md bg-[#FEF9C3] border border-[#F59E0B]/50 flex items-center justify-center mb-6"
          >
            <Mail className="w-10 h-10 text-[#F59E0B]" />
          </motion.div>

          <h1 className="font-syne font-extrabold text-4xl md:text-5xl text-[var(--text-primary)] mb-4 leading-tight">
            Check your email, {pendingVerification.firstName}!
          </h1>
          <p className="font-sans text-[var(--text-secondary)] text-base md:text-lg max-w-lg leading-relaxed">
            We sent a verification link to <span className="font-bold text-[var(--text-primary)]">{pendingVerification.email}</span>. Click the link to verify your account and sign in.
          </p>
          <p className="mt-3 font-sans text-xs text-[var(--text-secondary)] max-w-md">
            Don&apos;t see it? Check your <span className="font-bold">Spam</span> or <span className="font-bold">Promotions</span> folder.
          </p>

          <div className="mt-8 w-full max-w-sm space-y-3">
            <button
              type="button"
              onClick={onResend}
              disabled={resendCooldown > 0}
              className="w-full rounded-lg border border-[var(--text-primary)] bg-[var(--text-primary)] px-4 py-3 text-sm font-bold text-white hover:bg-[var(--yellow)] hover:text-[var(--text-primary)] transition-colors disabled:opacity-50"
            >
              {resendCooldown > 0 ? `Resend email in ${resendCooldown}s` : 'Resend Verification Email'}
            </button>
            <Link
              to="/login"
              className="block w-full rounded-lg border border-[var(--text-primary)]/20 bg-[var(--bg)] px-4 py-3 text-sm font-bold text-[var(--text-primary)] hover:bg-[var(--text-primary)]/5 transition-colors text-center"
            >
              Back to Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
