import React from 'react';
import { LogOut, Shield, KeyRound, MessageSquare, Star, Megaphone, ChevronRight } from 'lucide-react';
import { useNavigate, Link } from 'react-router';
import toast from 'react-hot-toast';
import { signOut } from '../../api/auth';
import { useAuthStore } from '../../store/authStore';
import { ThemeSelector } from './ui/ThemeToggle';

export const StudentSettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);
  const profile = useAuthStore((state) => state.profile);
  const isNoticeAdmin = Boolean(profile?.is_notice_admin) || profile?.role === 'admin';

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
    <div className="min-h-screen bg-slate-50/50 px-4 py-8 md:px-8 md:py-12 font-sans">
      <div className="mx-auto max-w-2xl">
        <div className="mb-10 text-center md:text-left">
          <p className="text-[11px] font-bold uppercase tracking-widest text-blue-500 mb-3">Settings</p>
          <h1 className="font-syne text-3xl md:text-4xl font-extrabold text-slate-900">Account controls</h1>
        </div>

        <div className="bg-white rounded-3xl shadow-[0_8px_30px_-12px_rgba(0,0,0,0.04)] border border-slate-100 overflow-hidden">
          
          <div className="p-6 md:p-8 border-b border-slate-100">
            <div className="flex items-center gap-4 mb-2">
              <h2 className="font-syne text-xl font-bold text-slate-900">Appearance</h2>
            </div>
            <p className="text-sm text-slate-500 mb-6">Choose how Campus Blink looks on your device</p>
            <div className="flex">
              <ThemeSelector />
            </div>
          </div>
          
          <div className="flex flex-col">
            <Link to="/student/bookmarks" className="group flex items-center justify-between p-6 md:p-8 border-b border-slate-100 hover:bg-slate-50 transition-colors">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                  <Star className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="font-syne text-lg font-bold text-slate-900 mb-1">Saved Bookmarks</h2>
                  <p className="text-sm text-slate-500">View your saved and favorite posts in the community.</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-blue-500 transition-colors flex-shrink-0" />
            </Link>

            <Link to="/student/settings/password" className="group flex items-center justify-between p-6 md:p-8 border-b border-slate-100 hover:bg-slate-50 transition-colors">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="font-syne text-lg font-bold text-slate-900 mb-1">Change Password</h2>
                  <p className="text-sm text-slate-500">Update your digital key to keep your account secure.</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-emerald-500 transition-colors flex-shrink-0" />
            </Link>

            <Link to="/student/settings/feedback" className="group flex items-center justify-between p-6 md:p-8 border-b border-slate-100 hover:bg-slate-50 transition-colors">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-500 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="font-syne text-lg font-bold text-slate-900 mb-1">Send Feedback</h2>
                  <p className="text-sm text-slate-500">Found a glitch or want a new feature? Tell us about it.</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-amber-500 transition-colors flex-shrink-0" />
            </Link>

            {isNoticeAdmin && (
              <Link to="/student/notices/admin" className="group flex items-center justify-between p-6 md:p-8 border-b border-slate-100 bg-amber-50/30 hover:bg-amber-50/60 transition-colors">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                    <Megaphone className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="font-syne text-lg font-bold text-orange-900 mb-1">Notice Admin</h2>
                    <p className="text-sm text-orange-700/70">Compose and manage official notices for your college.</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-orange-300 group-hover:text-orange-600 transition-colors flex-shrink-0" />
              </Link>
            )}
          </div>
          
          <div className="p-6 md:p-8 bg-slate-50/50">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-slate-200/50 text-slate-500 flex items-center justify-center flex-shrink-0">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="font-syne text-lg font-bold text-slate-900 mb-1">Session</h2>
                  <p className="text-sm text-slate-500 max-w-sm">Securely log off from your Campus Blink account on this device.</p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center justify-center gap-2 rounded-xl bg-white border border-rose-200 px-6 py-3 text-sm font-bold text-rose-500 transition-all hover:bg-rose-50 shadow-sm whitespace-nowrap"
              >
                <LogOut className="h-4 w-4" /> Log off
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
