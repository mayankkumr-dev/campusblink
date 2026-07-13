import React from 'react';
import { Navigate, Outlet } from 'react-router';
import { useAuthStore } from '../../store/authStore';
import { PageSkeleton } from '../../app/components/ui/PageSkeleton';

/** Returns the correct home path for any role */
function getRoleHome(role: string, professorStatus?: string): string {
  switch (role) {
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

  const isAdminEmail = false;

  if (profile?.role === 'admin' || isAdminEmail) {
    return <Outlet />;
  }

  // Redirect non-admins to their role's correct home
  return <Navigate to={getRoleHome(profile.role, profile.professor_status)} replace />;
};
