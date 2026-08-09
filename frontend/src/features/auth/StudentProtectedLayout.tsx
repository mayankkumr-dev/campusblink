import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router';
import { useAuthStore } from '../../store/authStore';
import { StudentLayout } from '../../app/components/StudentLayout';
import { PageSkeleton } from '../../app/components/ui/PageSkeleton';

/**
 * Returns the correct home path for a given role.
 * Used to redirect users who land on the wrong section.
 */
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
      // student and any unknown roles use student layout
      return '/student/home';
  }
}

export const ProtectedRoute: React.FC = () => {
  const location = useLocation();
  const user = useAuthStore((state) => state.user);
  const profile = useAuthStore((state) => state.profile);
  const isLoading = useAuthStore((state) => state.isLoading);
  const hasHydrated = (useAuthStore as any).persist?.hasHydrated?.() ?? true;

  if (!hasHydrated || isLoading) {
    return <PageSkeleton />;
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

  const isAdmin = profile.role === 'admin';

  if (isAdmin) {
    return <StudentLayout />;
  }

  const role = profile.role || 'student';

  const allowedRoles = ['student'];
  if (!allowedRoles.includes(role)) {
    // Redirect professors, canteen owners, print shops to their own home
    const home = getRoleHome(role, profile.professor_status);
    return <Navigate to={home} replace />;
  }

  return <StudentLayout />;
};

export const StudentProtectedLayout = ProtectedRoute;
