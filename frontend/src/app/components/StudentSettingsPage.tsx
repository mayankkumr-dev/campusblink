import React from 'react';
import { LogOut, Shield, KeyRound, MessageSquare, Star, Megaphone, ChevronRight, Moon } from 'lucide-react';
import { useNavigate, Link } from 'react-router';
import toast from 'react-hot-toast';
import { signOut } from '../../api/auth';
import { useAuthStore } from '../../store/authStore';
import { useTheme } from 'next-themes';
import { supabase } from '../../lib/supabase';

export const StudentSettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);
  const profile = useAuthStore((state) => state.profile);
  const isNoticeAdmin = Boolean(profile?.is_notice_admin) || profile?.role === 'admin';
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  const [messagePrivacy, setMessagePrivacy] = React.useState('Your Followers');
  const [isUpdatingPrivacy, setIsUpdatingPrivacy] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
    const load = async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token || '';
      fetch('/api/messages/preferences', {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(res => res.json())
        .then(data => {
          if (data && data.messagePrivacy) setMessagePrivacy(data.messagePrivacy);
        })
        .catch(console.error);
    };
    load();
  }, []);

  const handlePrivacyChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newValue = e.target.value;
    setMessagePrivacy(newValue);
    setIsUpdatingPrivacy(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token || '';
      const res = await fetch('/api/messages/preferences', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ messagePrivacy: newValue })
      });
      if (!res.ok) throw new Error();
      toast.success('Privacy settings updated');
    } catch (error) {
      toast.error('Failed to update privacy');
    } finally {
      setIsUpdatingPrivacy(false);
    }
  };


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
    <div className="min-h-screen bg-background px-4 py-8 md:px-8 md:py-12 font-sans">
      <div className="mx-auto max-w-2xl">
        <div className="mb-10 text-center md:text-left">
          <p className="text-[11px] font-bold uppercase tracking-widest text-accent-blue mb-3">Settings</p>
          <h1 className="font-syne text-3xl md:text-4xl font-extrabold text-text-primary">Account controls</h1>
        </div>

        <div className="bg-surface rounded-3xl border border-border-subtle overflow-hidden">
          
          <div className="flex flex-col">
            <Link to="/student/bookmarks" className="group flex items-center justify-between p-6 md:p-8 border-b border-border-subtle hover:bg-surface-elevated transition-colors">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-accent-blue-soft text-accent-blue flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                  <Star className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="font-syne text-lg font-bold text-text-primary mb-1">Saved Bookmarks</h2>
                  <p className="text-sm text-text-secondary">View your saved and favorite posts in the community.</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-text-secondary group-hover:text-accent-blue transition-colors flex-shrink-0" />
            </Link>

            <Link to="/student/settings/password" className="group flex items-center justify-between p-6 md:p-8 border-b border-border-subtle hover:bg-surface-elevated transition-colors">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-accent-green/15 text-accent-green flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="font-syne text-lg font-bold text-text-primary mb-1">Change Password</h2>
                  <p className="text-sm text-text-secondary">Update your digital key to keep your account secure.</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-text-secondary group-hover:text-accent-green transition-colors flex-shrink-0" />
            </Link>

            <Link to="/student/settings/feedback" className="group flex items-center justify-between p-6 md:p-8 border-b border-border-subtle hover:bg-surface-elevated transition-colors">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-accent-amber-soft text-accent-amber flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="font-syne text-lg font-bold text-text-primary mb-1">Send Feedback</h2>
                  <p className="text-sm text-text-secondary">Found a glitch or want a new feature? Tell us about it.</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-text-secondary group-hover:text-accent-amber transition-colors flex-shrink-0" />
            </Link>

            {/* Appearance Row */}
            <div className="group flex flex-col md:flex-row md:items-center justify-between p-6 md:p-8 border-b border-border-subtle bg-surface transition-colors gap-4">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-accent-purple/15 text-accent-purple flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                  <Moon className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="font-syne text-lg font-bold text-text-primary mb-1">Appearance</h2>
                  <p className="text-sm text-text-secondary">Choose how Campus Blink looks on this device.</p>
                </div>
              </div>
              
              <div className="flex p-1 bg-slate-100 dark:bg-surface-elevated rounded-xl border border-slate-200 dark:border-border-subtle self-start md:self-auto shrink-0 w-full md:w-auto mt-2 md:mt-0 transition-colors">
                {['light', 'dark'].map((t) => {
                  const isActive = mounted && theme === t;
                  return (
                    <button
                      key={t}
                      onClick={() => setTheme(t)}
                      className={`flex-1 md:flex-none px-4 py-2 text-sm font-medium rounded-lg capitalize transition-colors ${
                        isActive 
                          ? 'bg-accent-blue text-white shadow-sm' 
                          : 'text-slate-500 hover:text-slate-900 dark:text-text-secondary dark:hover:text-text-primary hover:bg-slate-200/50 dark:hover:bg-transparent'
                      }`}
                    >
                      {t}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Messages Privacy Row */}
            <div className="group flex flex-col md:flex-row md:items-center justify-between p-6 md:p-8 border-b border-border-subtle bg-surface transition-colors gap-4">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="font-syne text-lg font-bold text-text-primary mb-1">Messages</h2>
                  <p className="text-sm text-text-secondary">Who can send you messages?</p>
                </div>
              </div>
              
              <div className="flex self-start md:self-auto shrink-0 w-full md:w-auto mt-2 md:mt-0">
                <select
                  value={messagePrivacy}
                  onChange={handlePrivacyChange}
                  disabled={isUpdatingPrivacy}
                  className="w-full md:w-48 bg-surface-elevated border border-border-subtle text-text-primary text-sm rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-accent-blue/20 focus:border-accent-blue outline-none transition-all shadow-[0_2px_8px_rgba(0,0,0,0.04)]"
                >
                  <option value="Everyone">Everyone</option>
                  <option value="Your Followers">Your Followers</option>
                  <option value="Nobody">Nobody</option>
                </select>
              </div>
            </div>

            {isNoticeAdmin && (
              <Link to="/student/notices/admin" className="group flex items-center justify-between p-6 md:p-8 border-b border-border-subtle bg-accent-amber-soft transition-colors">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-accent-amber/20 text-accent-amber flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                    <Megaphone className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="font-syne text-lg font-bold text-accent-amber mb-1">Notice Admin</h2>
                    <p className="text-sm text-accent-amber/80">Compose and manage official notices for your college.</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-accent-amber/50 group-hover:text-accent-amber transition-colors flex-shrink-0" />
              </Link>
            )}
          </div>
          
          <div className="p-6 md:p-8 bg-surface">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-surface-elevated text-text-secondary flex items-center justify-center flex-shrink-0 border border-border-subtle">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="font-syne text-lg font-bold text-text-primary mb-1">Session</h2>
                  <p className="text-sm text-text-secondary max-w-sm">Securely log off from your Campus Blink account on this device.</p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center justify-center gap-2 rounded-xl bg-surface border border-accent-red px-6 py-3 text-sm font-bold text-accent-red transition-all hover:bg-accent-red hover:text-white shadow-sm whitespace-nowrap"
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
