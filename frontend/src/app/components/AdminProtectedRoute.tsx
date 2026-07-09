import React from 'react';
import { Navigate, Outlet } from 'react-router';
import { useAuthStore } from '../../store/authStore';

export const AdminProtectedRoute: React.FC = () => {
  const user = useAuthStore((state) => state.user);
  const profile = useAuthStore((state) => state.profile);

  const hasHydrated = (useAuthStore as any).persist?.hasHydrated?.() ?? true;

  if (!hasHydrated) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] flex items-center justify-center">
        <div className="text-sm font-sans text-[var(--text-secondary)]">Checking access...</div>
      </div>
    );
  }

  if (!user || !profile) {
    return <Navigate to="/login" replace />;
  }

  const adminByEmail = profile?.email === 'contactus.mayank@gmail.com' || user?.email === 'contactus.mayank@gmail.com';
  const adminByRole = profile?.role === 'admin';

  if (!adminByRole && !adminByEmail) {
    return <Navigate to="/student/home" replace />;
  }

  return <Outlet />;
};
