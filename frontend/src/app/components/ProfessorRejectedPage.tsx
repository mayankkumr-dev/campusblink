import React from 'react';
import { useAuthStore } from '../../store/authStore';
import { Link } from 'react-router';
import { XCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';

export const ProfessorRejectedPage: React.FC = () => {
  const profile = useAuthStore(state => state.profile);
  
  const handleLogout = async () => {
    await supabase.auth.signOut();
    useAuthStore.getState().logout();
  };

  return (
    <div className="min-h-screen bg-[#FDFDFD] flex flex-col items-center justify-center p-6 text-center">
      <div className="max-w-md w-full flex flex-col items-center">
        <XCircle className="w-12 h-12 text-[#DC2626] mb-6 dark:text-red-400 transition-colors" />
        
        <h1 className="font-syne font-bold text-2xl text-[var(--text-primary)] tracking-tight mb-4">
          Application Not Approved
        </h1>
        
        <p className="font-sans text-sm text-[var(--text-secondary)] mb-4 leading-relaxed">
          Unfortunately your faculty account was not approved.
        </p>
        
        {profile?.professor_rejection_reason && (
          <div className="bg-[#FFF4F4] w-full p-4 rounded-xl border border-accent-red/20 mb-4">
            <p className="font-sans text-sm text-[#DC2626] font-medium text-left">
              Reason: {profile.professor_rejection_reason}
            </p>
          </div>
        )}

        <p className="font-sans text-sm text-[var(--text-secondary)] mb-8 leading-relaxed">
          Please contact your college admin for more information.
        </p>

        <button 
          onClick={handleLogout}
          className="mt-6 font-sans font-medium text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
        >
          Logout
        </button>
      </div>
    </div>
  );
};
