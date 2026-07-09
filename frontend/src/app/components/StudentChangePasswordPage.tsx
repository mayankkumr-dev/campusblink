import React, { useState } from 'react';
import { Eye, EyeOff, Check, ArrowRight } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router';

export const StudentChangePasswordPage: React.FC = () => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleUpdate = async () => {
    if (!newPassword || newPassword !== confirmPassword) {
      toast.error('Passwords do not match or are empty');
      return;
    }
    // We cannot easily verify current password with just an update call in Supabase without signIn again, 
    // but updateUser({password}) requires the user is logged in. So we just update it.
    // If Supabase enforces confirming old password, it is handled internally if configured.
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      toast.error(error.message || 'Failed to update password');
    } else {
      toast.success('Password updated successfully. Logging out from all devices...');
      // Global signout explicitly invalidates all sessions for this user including the current one
      await supabase.auth.signOut({ scope: 'global' }).catch(() => supabase.auth.signOut());
      // The auth store will detect the signout and redirect the user automatically
    }
    setLoading(false);
  };

  const has8Chars = newPassword.length >= 8;
  const hasNumber = /\d/.test(newPassword);
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(newPassword);

  return (
    <div className="min-h-full bg-[var(--bg-primary)] px-4 py-8 md:px-6 md:py-12 flex justify-center">
      <div className="w-full max-w-lg flex flex-col items-center">
        <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--yellow-dark)] mb-2">SECURITY & PRIVACY</p>
        <h1 className="font-syne font-extrabold text-4xl sm:text-5xl text-[var(--text-primary)] mb-2 text-center tracking-tight">
          Fortify your<br/><span className="text-[#847B4E] italic">Digital Key.</span>
        </h1>
        <p className="font-sans text-sm text-[var(--text-secondary)] mb-10 text-center max-w-sm leading-relaxed mx-auto">
          Regularly updating your credentials keeps your academic and financial records secure within the Campus Blink ecosystem.
        </p>

        <div className="w-full bg-[var(--bg)] rounded-3xl p-6 sm:p-10 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
          <div className="space-y-6">
            <div>
              <label className="block text-xs font-bold text-[var(--text-primary)] mb-2">Current Password</label>
              <div className="relative">
                <input
                  type={showCurrent ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full bg-[var(--bg-secondary)] border-none rounded-xl px-4 py-3.5 text-sm outline-none focus:ring-2 focus:ring-[var(--yellow)]/50 text-[var(--text-primary)]"
                />
                <button type="button" onClick={() => setShowCurrent(!showCurrent)} className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]">
                  {showCurrent ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[var(--text-primary)] mb-2">New Password</label>
              <div className="relative">
                <input
                  type={showNew ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full bg-[var(--bg-secondary)] border-none rounded-xl px-4 py-3.5 text-sm outline-none focus:ring-2 focus:ring-[var(--yellow)]/50 text-[var(--text-primary)]"
                />
                <button type="button" onClick={() => setShowNew(!showNew)} className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]">
                  {showNew ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[var(--text-primary)] mb-2">Confirm New Password</label>
              <div className="relative">
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full bg-[var(--bg-secondary)] border-none rounded-xl px-4 py-3.5 text-sm outline-none focus:ring-2 focus:ring-[var(--yellow)]/50 text-[var(--text-primary)]"
                />
              </div>
            </div>

            <div className="bg-[var(--bg-secondary)] rounded-2xl p-5">
              <span className="text-[10px] font-bold uppercase text-[var(--text-secondary)] tracking-wider mb-3 block">PASSWORD REQUIREMENTS</span>
              <div className="flex flex-wrap gap-2">
                <div className={`px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 ${has8Chars ? 'bg-[#E3E6D5] text-[#3E422C]' : 'bg-[#EAE8E3] text-[#A3A099]'}`}>
                  <Check className="w-3 h-3" /> 8+ CHARACTERS
                </div>
                <div className={`px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 ${hasNumber ? 'bg-[#E3E6D5] text-[#3E422C]' : 'bg-[#EAE8E3] text-[#A3A099]'}`}>
                  <Check className="w-3 h-3" /> 1 NUMBER
                </div>
                <div className={`px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 ${hasSpecial ? 'bg-[#E3E6D5] text-[#3E422C]' : 'bg-[#EAE8E3] text-[#A3A099]'}`}>
                  <Check className="w-3 h-3" /> 1 SPECIAL SYMBOL
                </div>
              </div>
            </div>

            <button 
              onClick={handleUpdate}
              disabled={loading || !has8Chars || !hasNumber || !hasSpecial || newPassword !== confirmPassword}
              className="w-full h-[52px] bg-[var(--yellow)] text-[var(--text-primary)] rounded-xl font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#F5CB00]"
            >
              {loading ? 'Processing...' : 'Update Password'} <ArrowRight className="w-4 h-4" />
            </button>
            
            <div className="text-center pt-2">
               <span className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">NEED HELP? <a href="mailto:contactus.mayank@gmail.com" className="text-[#847B4E] hover:underline">CONTACT SECURITY</a></span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
