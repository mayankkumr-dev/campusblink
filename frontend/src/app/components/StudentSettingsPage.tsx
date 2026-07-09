import React from 'react';
import { LogOut, Shield, KeyRound, MessageSquare, Star, Bell } from 'lucide-react';
import { useNavigate, Link } from 'react-router';
import toast from 'react-hot-toast';
import { signOut } from '../../api/auth';
import { useAuthStore } from '../../store/authStore';
import { ThemeSelector } from './ui/ThemeToggle';

export const StudentSettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);

  const handleLogout = async () => {
    const toastId = toast.loading('Logging you out...');
    try {
      await signOut();
      setAuth(null, null);
      toast.success('Logged out successfully.', { id: toastId });
      navigate('/');
    } catch (error: any) {
      toast.error(error?.message || 'Failed to log out.', { id: toastId });
    }
  };

  return (
    <div className="min-h-full bg-[var(--bg-primary)] px-4 py-6 md:px-6">
      <div className="mx-auto max-w-3xl overflow-hidden rounded-[32px] border border-black/10 bg-[var(--bg)] shadow-[0_24px_70px_rgba(15,23,42,0.06)]">
        <div className="border-b border-black/10 px-6 py-5">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--text-secondary)]">Settings</p>
          <h1 className="mt-2 font-syne text-3xl font-extrabold text-[var(--text-primary)]">Account controls</h1>
        </div>

        <div className="space-y-4 px-6 py-6">
          <div className="rounded-[24px] border border-[var(--border)] bg-[var(--bg-3)] p-5">
            <h2 className="font-syne text-xl font-bold text-[var(--text-primary)]">Appearance</h2>
            <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">Choose how Campus Blink looks on your device</p>
            <div className="mt-4 flex justify-center">
              <ThemeSelector />
            </div>
          </div>
          
          <Link to="/student/bookmarks" className="block rounded-[24px] border border-black/10 bg-[var(--bg-primary)] p-5 hover:bg-[#F5CB00]/10 transition-colors group">
            <div className="flex items-start gap-3">
              <Star className="mt-0.5 h-5 w-5 text-[var(--text-primary)] group-hover:text-[var(--yellow-dark)] transition-colors" />
              <div>
                <h2 className="font-syne text-xl font-bold text-[var(--text-primary)]">Saved Bookmarks</h2>
                <p className="mt-1 text-sm leading-6 text-[#64748B]">View your saved and favorite posts in the community.</p>
              </div>
            </div>
          </Link>

          <Link to="/student/settings/password" className="block rounded-[24px] border border-black/10 bg-[var(--bg-primary)] p-5 hover:bg-[#F5CB00]/10 transition-colors group">
            <div className="flex items-start gap-3">
              <KeyRound className="mt-0.5 h-5 w-5 text-[var(--text-primary)] group-hover:text-[var(--yellow-dark)] transition-colors" />
              <div>
                <h2 className="font-syne text-xl font-bold text-[var(--text-primary)]">Change Password</h2>
                <p className="mt-1 text-sm leading-6 text-[#64748B]">Update your digital key to keep your account secure.</p>
              </div>
            </div>
          </Link>

          <Link to="/student/settings/feedback" className="block rounded-[24px] border border-black/10 bg-[var(--bg-primary)] p-5 hover:bg-[#F5CB00]/10 transition-colors group">
            <div className="flex items-start gap-3">
              <MessageSquare className="mt-0.5 h-5 w-5 text-[var(--text-primary)] group-hover:text-[var(--yellow-dark)] transition-colors" />
              <div>
                <h2 className="font-syne text-xl font-bold text-[var(--text-primary)]">Send Feedback</h2>
                <p className="mt-1 text-sm leading-6 text-[#64748B]">Found a glitch or want a new feature? Tell us about it.</p>
              </div>
            </div>
          </Link>

          <Link to="/student/settings/notifications" className="block rounded-[24px] border border-black/10 bg-[var(--bg-primary)] p-5 hover:bg-[#F5CB00]/10 transition-colors group">
            <div className="flex items-start gap-3">
              <Bell className="mt-0.5 h-5 w-5 text-[var(--text-primary)] group-hover:text-[var(--yellow-dark)] transition-colors" />
              <div>
                <h2 className="font-syne text-xl font-bold text-[var(--text-primary)]">Notification Preferences</h2>
                <p className="mt-1 text-sm leading-6 text-[#64748B]">Choose which push alerts you want to receive on this device.</p>
              </div>
            </div>
          </Link>

          <div className="rounded-[24px] border border-black/10 bg-[var(--bg-primary)] p-5">
            <div className="flex items-start gap-3">
              <Shield className="mt-0.5 h-5 w-5 text-[var(--text-primary)]" />
              <div>
                <h2 className="font-syne text-xl font-bold text-[var(--text-primary)]">Session</h2>
                <p className="mt-1 text-sm leading-6 text-[#64748B]">Use this option to securely log off from your Campus Blink account on this device.</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="mt-5 inline-flex items-center gap-2 rounded-md border border-red-200 bg-[var(--bg)] px-5 py-2.5 text-sm font-bold text-red-500 transition-colors hover:bg-red-50"
            >
              <LogOut className="h-4 w-4" /> Log off
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
