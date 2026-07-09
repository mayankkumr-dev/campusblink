import React from 'react';
import { Navigate, Outlet, useNavigate } from 'react-router';
import { useAuthStore } from '../../store/authStore';
import { PageSkeleton } from './ui/PageSkeleton';

function AccessDenied() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-[var(--yellow)]/20 text-4xl">🔒</div>
        <h2 className="font-syne text-2xl font-extrabold text-[var(--text-primary)]">Access Restricted</h2>
        <p className="mt-2 text-sm text-[var(--text-secondary)] leading-relaxed">
          You don't have permission to access this dashboard. Please contact an admin to request access — they can grant you the required role.
        </p>
        <button
          onClick={() => navigate('/student/home', { replace: true })}
          className="mt-5 inline-flex items-center gap-2 rounded-md bg-[var(--text-primary)] px-5 py-2.5 text-sm font-bold text-white hover:bg-[var(--yellow)] hover:text-[var(--text-primary)] transition-colors"
        >
          Go to Home
        </button>
      </div>
    </div>
  );
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

  const hasAccess = profile.role === 'canteen_owner' || profile.role === 'admin';
  if (!hasAccess) {
    return <AccessDenied />;
  }

  return <Outlet />;
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

  const hasAccess = profile.role === 'print_shop' || profile.role === 'admin';
  if (!hasAccess) {
    return <AccessDenied />;
  }

  return <Outlet />;
};
