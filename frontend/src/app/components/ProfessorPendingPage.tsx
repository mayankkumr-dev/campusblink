import React from 'react';
import { useAuthStore } from '../../store/authStore';
import { Link, useNavigate } from 'react-router';
import { Clock } from 'lucide-react';
import { supabase } from '../../lib/supabase';

export const ProfessorPendingPage: React.FC = () => {
  const profile = useAuthStore(state => state.profile);
  const user = useAuthStore(state => state.user);
  const navigate = useNavigate();
  
  const handleLogout = async () => {
    await supabase.auth.signOut();
    useAuthStore.getState().logout();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-[#FDFDFD] flex flex-col items-center justify-center p-6 text-center">
      <div className="max-w-md w-full flex flex-col items-center">
        <Clock className="w-12 h-12 text-[var(--border)] mb-6 dark:text-slate-600 transition-colors" />
        
        <h1 className="font-syne font-bold text-2xl text-[var(--text-primary)] tracking-tight mb-4">
          Application Under Review
        </h1>
        
        <p className="font-sans text-sm text-[var(--text-secondary)] mb-2 leading-relaxed">
          Please wait for approval. We don't want any unknown joining the application and becoming a professor for safety and privacy reasons.
        </p>
        <p className="font-sans text-sm text-[var(--text-secondary)] mb-2 leading-relaxed">
          You will receive an email once your account is approved.
        </p>
        
        {user?.email && (
          <p className="font-sans font-medium text-sm text-[var(--text-primary)] mb-8">
            {user.email}
          </p>
        )}

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
