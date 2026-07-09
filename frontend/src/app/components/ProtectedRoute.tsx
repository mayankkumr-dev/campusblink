import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router';
import { useAuthStore } from '../../store/authStore';

export const ProtectedRoute: React.FC = () => {
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

  if (String(profile?.status || '').toLowerCase() === 'banned') {
    return <Navigate to="/account-restricted?status=banned" replace />;
  }

  return <Outlet />;
};
