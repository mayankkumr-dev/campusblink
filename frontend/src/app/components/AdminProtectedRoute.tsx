import React from 'react';
import { Navigate, Outlet } from 'react-router';
import { useAuthStore } from '../../store/authStore';
import { PageSkeleton } from './ui/PageSkeleton';

export const AdminProtectedRoute: React.FC = () => {
  const user = useAuthStore((state) => state.user);
  const profile = useAuthStore((state) => state.profile);

  const hasHydrated = (useAuthStore as any).persist?.hasHydrated?.() ?? true;

  if (!hasHydrated) {
    return <PageSkeleton />;
  }

  if (!user || !profile) {
    return <Navigate to="/login" replace />;
  }

  const isAdminEmail =
    user.email?.toLowerCase() === 'contactus.mayank@gmail.com' ||
    profile.email?.toLowerCase() === 'contactus.mayank@gmail.com';

  if (profile?.role !== 'admin' && !isAdminEmail) {
    return <Navigate to="/student/home" replace />;
  }

  return <Outlet />;
};
