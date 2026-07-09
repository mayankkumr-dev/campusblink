import React, { useState } from 'react';
import { Eye, EyeOff, Check, ArrowRight, ShieldCheck } from 'lucide-react';
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
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      toast.error(error.message || 'Failed to update password');
    } else {
      toast.success('Password updated successfully. Logging out from all devices...');
      await supabase.auth.signOut({ scope: 'global' }).catch(() => supabase.auth.signOut());
    }
    setLoading(false);
  };

  const has8Chars = newPassword.length >= 8;
  const hasNumber = /\d/.test(newPassword);
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(newPassword);

  return (
    <div className="min-h-screen bg-slate-50/50 px-4 py-8 md:px-8 md:py-16 flex justify-center font-sans">
      <div className="w-full max-w-[520px] flex flex-col items-center">
        
        <div className="w-16 h-16 rounded-3xl bg-blue-50 text-blue-500 flex items-center justify-center mb-6 shadow-sm border border-blue-100">
           <ShieldCheck className="w-8 h-8" />
        </div>

        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-blue-500 mb-3">SECURITY & PRIVACY</p>
        <h1 className="font-syne font-extrabold text-3xl md:text-5xl text-slate-900 mb-3 text-center tracking-tight">
          Fortify your<br/><span className="text-blue-600">Digital Key.</span>
        </h1>
        <p className="text-sm md:text-[15px] text-slate-500 mb-12 text-center max-w-sm leading-relaxed mx-auto">
          Regularly updating your credentials keeps your academic and financial records secure within Campus Blink.
        </p>

        <div className="w-full bg-white rounded-[2rem] p-6 sm:p-10 shadow-[0_8px_30px_-12px_rgba(0,0,0,0.06)] border border-slate-100 relative overflow-hidden">
          <div className="space-y-6 relative z-10">
            <div>
              <label className="block text-[13px] font-bold text-slate-700 mb-2">Current Password</label>
              <div className="relative">
                <input
                  type={showCurrent ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full bg-slate-50/50 border border-slate-200 rounded-2xl px-5 py-4 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50/50 text-slate-900 transition-all placeholder:text-slate-400"
                />
                <button type="button" onClick={() => setShowCurrent(!showCurrent)} className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
                  {showCurrent ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-[13px] font-bold text-slate-700 mb-2">New Password</label>
              <div className="relative">
                <input
                  type={showNew ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full bg-slate-50/50 border border-slate-200 rounded-2xl px-5 py-4 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50/50 text-slate-900 transition-all placeholder:text-slate-400"
                />
                <button type="button" onClick={() => setShowNew(!showNew)} className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
                  {showNew ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-[13px] font-bold text-slate-700 mb-2">Confirm New Password</label>
              <div className="relative">
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full bg-slate-50/50 border border-slate-200 rounded-2xl px-5 py-4 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50/50 text-slate-900 transition-all placeholder:text-slate-400"
                />
              </div>
            </div>

            <div className="bg-slate-50/80 rounded-2xl p-5 border border-slate-100">
              <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider mb-4 block">Password Requirements</span>
              <div className="flex flex-col gap-3">
                <div className={`flex items-center gap-3 text-[13px] font-bold transition-colors ${has8Chars ? 'text-emerald-600' : 'text-slate-400'}`}>
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center ${has8Chars ? 'bg-emerald-100' : 'bg-slate-200'}`}>
                    <Check className="w-3 h-3" />
                  </div>
                  8+ characters
                </div>
                <div className={`flex items-center gap-3 text-[13px] font-bold transition-colors ${hasNumber ? 'text-emerald-600' : 'text-slate-400'}`}>
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center ${hasNumber ? 'bg-emerald-100' : 'bg-slate-200'}`}>
                    <Check className="w-3 h-3" />
                  </div>
                  Contains at least 1 number
                </div>
                <div className={`flex items-center gap-3 text-[13px] font-bold transition-colors ${hasSpecial ? 'text-emerald-600' : 'text-slate-400'}`}>
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center ${hasSpecial ? 'bg-emerald-100' : 'bg-slate-200'}`}>
                    <Check className="w-3 h-3" />
                  </div>
                  Contains 1 special symbol
                </div>
              </div>
            </div>

            <div className="pt-2">
              <button 
                onClick={handleUpdate}
                disabled={loading || !has8Chars || !hasNumber || !hasSpecial || newPassword !== confirmPassword}
                className="w-full h-14 bg-blue-600 text-white rounded-2xl font-bold flex items-center justify-center gap-2 transition-all shadow-[0_4px_20px_-5px_rgba(37,99,235,0.4)] disabled:opacity-50 disabled:shadow-none disabled:cursor-not-allowed hover:bg-blue-700 hover:-translate-y-0.5"
              >
                {loading ? 'Processing...' : 'Update Password'} <ArrowRight className="w-5 h-5" />
              </button>
            </div>
            
            <div className="text-center pt-2">
               <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">NEED HELP? <a href="mailto:contactus.mayank@gmail.com" className="text-blue-500 hover:text-blue-600 hover:underline transition-colors ml-1">CONTACT SECURITY</a></span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
