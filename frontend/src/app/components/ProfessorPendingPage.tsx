import React, { useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { useNavigate } from 'react-router';
import { Clock, RefreshCw, LogOut, CheckCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { getProfile } from '../../api/auth';
import toast from 'react-hot-toast';

export const ProfessorPendingPage: React.FC = () => {
  const user = useAuthStore(state => state.user);
  const setProfile = useAuthStore(state => state.setProfile);
  const navigate = useNavigate();
  const [checking, setChecking] = useState(false);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    useAuthStore.getState().logout();
    navigate('/');
  };

  const handleCheckStatus = async () => {
    if (!user?.id) return;
    setChecking(true);
    try {
      const { data: freshProfile } = await getProfile(user.id);
      if (freshProfile) {
        setProfile({ ...freshProfile, email: freshProfile.email || user.email });
        const status = String(freshProfile.professor_status || 'pending').toLowerCase();
        if (status === 'approved') {
          toast.success('Your account has been approved! Welcome aboard 🎉');
          navigate('/professor/home', { replace: true });
          return;
        } else if (status === 'rejected') {
          toast.error('Your application was not approved.');
          navigate('/professor/rejected', { replace: true });
          return;
        } else {
          toast('Your application is still under review.', { icon: '⏳' });
        }
      }
    } catch {
      toast.error('Could not check status. Please try again.');
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 text-center">
      <div className="max-w-sm w-full flex flex-col items-center">

        {/* Icon */}
        <div className="w-16 h-16 rounded-full bg-amber-100 border-2 border-amber-300 flex items-center justify-center mb-6 shadow-sm">
          <Clock className="w-8 h-8 text-amber-600" />
        </div>

        {/* Heading */}
        <h1 className="font-syne font-bold text-2xl text-slate-900 tracking-tight mb-3">
          Application Under Review
        </h1>

        {/* Description */}
        <p className="text-sm text-slate-700 mb-2 leading-relaxed font-medium">
          Your professor account request is being reviewed by an administrator. This usually takes 1–2 business days.
        </p>
        <p className="text-sm text-slate-700 mb-6 leading-relaxed font-medium">
          Once approved, you'll receive an email and can log back in to access your professor dashboard.
        </p>

        {/* Email shown */}
        {user?.email && (
          <div className="w-full bg-amber-50 border border-amber-300 rounded-xl px-4 py-3 mb-6 shadow-sm">
            <p className="text-xs text-amber-700 uppercase tracking-wider font-bold mb-0.5">Account</p>
            <p className="font-bold text-sm text-amber-900">{user.email}</p>
          </div>
        )}

        {/* Check Status Button */}
        <button
          onClick={handleCheckStatus}
          disabled={checking}
          className="w-full h-11 rounded-xl bg-slate-900 text-white font-semibold text-sm flex items-center justify-center gap-2 hover:bg-slate-800 active:scale-[0.98] transition-all disabled:opacity-50 mb-3 shadow-sm"
        >
          {checking ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              Checking…
            </>
          ) : (
            <>
              <CheckCircle className="w-4 h-4" />
              Check Approval Status
            </>
          )}
        </button>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="w-full h-11 rounded-xl border-2 border-slate-200 text-slate-700 font-bold text-sm flex items-center justify-center gap-2 hover:bg-slate-50 active:scale-[0.98] transition-all"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>

        <p className="mt-8 text-xs text-slate-500 font-medium leading-relaxed">
          Already got the approval email? Tap <strong className="text-slate-700">Check Approval Status</strong> above — no need to sign out first.
        </p>
      </div>
    </div>
  );
};
