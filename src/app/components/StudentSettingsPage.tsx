import React from 'react';
import { LogOut, Shield } from 'lucide-react';
import { useNavigate } from 'react-router';
import toast from 'react-hot-toast';
import { signOut } from '../../api/auth';
import { useAuthStore } from '../../store/authStore';

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
    <div className="min-h-full bg-[#FAFAF8] px-4 py-6 md:px-6">
      <div className="mx-auto max-w-3xl overflow-hidden rounded-[32px] border border-black/10 bg-white shadow-[0_24px_70px_rgba(15,23,42,0.06)]">
        <div className="border-b border-black/10 px-6 py-5">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#6B6B6B]">Settings</p>
          <h1 className="mt-2 font-syne text-3xl font-extrabold text-[#0D0D0D]">Account controls</h1>
        </div>

        <div className="space-y-4 px-6 py-6">
          <div className="rounded-[24px] border border-black/10 bg-[#FAFAF8] p-5">
            <div className="flex items-start gap-3">
              <Shield className="mt-0.5 h-5 w-5 text-[#0D0D0D]" />
              <div>
                <h2 className="font-syne text-xl font-bold text-[#0D0D0D]">Session</h2>
                <p className="mt-1 text-sm leading-6 text-[#444444]">Use this option to securely log off from your Campus Blink account on this device.</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="mt-5 inline-flex items-center gap-2 rounded-md border border-red-200 bg-white px-5 py-2.5 text-sm font-bold text-red-500 transition-colors hover:bg-red-50"
            >
              <LogOut className="h-4 w-4" /> Log off
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
