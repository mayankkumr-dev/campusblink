import React from 'react';
import { Navigate, Outlet } from 'react-router';
import { useAuthStore } from '../../store/authStore';
import { PageSkeleton } from './ui/PageSkeleton';

/** Returns the correct home path for any role */
function getRoleHome(role: string, professorStatus?: string): string {
  switch (role) {
    case 'admin':
      return '/admin';
    case 'professor': {
      const status = String(professorStatus || 'pending').toLowerCase();
      if (status === 'approved') return '/professor/home';
      if (status === 'rejected') return '/professor/rejected';
      return '/professor/pending';
    }
    case 'canteen_owner':
      return '/canteen-dashboard';
    case 'print_shop':
      return '/print-dashboard';
    default:
      return '/student/home';
  }
}

export const CanteenDashboardProtectedRoute: React.FC = () => {
  const user = useAuthStore((state) => state.user);
  const profile = useAuthStore((state) => state.profile);
  const hasHydrated = (useAuthStore as any).persist?.hasHydrated?.() ?? true;

  if (!hasHydrated) {
    return <PageSkeleton />;
  }

  if (!user || !profile) {
    return <Navigate to="/login" replace />;
  }

  if (profile.role === 'canteen_owner' || profile.role === 'admin') {
    return <Outlet />;
  }

  // Redirect any other role to their own home
  return <Navigate to={getRoleHome(profile.role, profile.professor_status)} replace />;
};

export const PrintDashboardProtectedRoute: React.FC = () => {
  const user = useAuthStore((state) => state.user);
  const profile = useAuthStore((state) => state.profile);
  const hasHydrated = (useAuthStore as any).persist?.hasHydrated?.() ?? true;

  if (!hasHydrated) {
    return <PageSkeleton />;
  }

  if (!user || !profile) {
    return <Navigate to="/login" replace />;
  }

  if (profile.role === 'print_shop' || profile.role === 'admin') {
    return <Outlet />;
  }

  // Redirect any other role to their own home
  return <Navigate to={getRoleHome(profile.role, profile.professor_status)} replace />;
};
