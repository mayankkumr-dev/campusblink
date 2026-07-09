import React from 'react';
import { Navigate, useLocation } from 'react-router';
import { useAuthStore } from '../../store/authStore';
import { ProfessorLayout } from './ProfessorLayout';

export const ProfessorProtectedLayout: React.FC = () => {
  const location = useLocation();
  const user = useAuthStore((state) => state.user);
  const profile = useAuthStore((state) => state.profile);
  const isLoading = useAuthStore((state) => state.isLoading);
  const hasHydrated = (useAuthStore as any).persist?.hasHydrated?.() ?? true;

  if (!hasHydrated || isLoading) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] flex items-center justify-center">
        <div className="text-sm font-sans text-[var(--text-secondary)]">Loading...</div>
      </div>
    );
  }

  if (!user || !profile) {
    return (
      <Navigate
        to="/login"
        state={{ from: `${location.pathname}${location.search}` }}
        replace
      />
    );
  }

  // Only professors and admins can access /professor/*
  if (profile.role !== 'professor' && profile.role !== 'admin') {
    return <Navigate to="/student/home" replace />;
  }

  // Banned professors
  if (String(profile?.status || '').toLowerCase() === 'banned') {
    return <Navigate to="/account-restricted?status=banned" replace />;
  }

  // If Admin, bypass pending/rejected checks
  if (profile.role === 'admin') {
    return <ProfessorLayout />;
  }

  // Pending professor
  const profStatus = String(profile.professor_status || 'pending').toLowerCase();
  
  if (profStatus === 'pending') {
    return <Navigate to="/professor/pending" replace />;
  }

  // Rejected professor
  if (profStatus === 'rejected') {
    return <Navigate to="/professor/rejected" replace />;
  }

  return <ProfessorLayout />;
};
