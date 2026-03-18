import React from 'react';
import { Navigate, Outlet, useNavigate } from 'react-router';
import { useAuthStore } from '../../store/authStore';

function AccessDenied() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-[#FAFAF8] flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-[#FFD600]/20 text-4xl">🔒</div>
        <h2 className="font-syne text-2xl font-extrabold text-[#0D0D0D]">Access Restricted</h2>
        <p className="mt-2 text-sm text-[#6B6B6B] leading-relaxed">
          You don't have permission to access this dashboard. Please contact an admin to request access — they can grant you the required role.
        </p>
        <button
          onClick={() => navigate('/student/home', { replace: true })}
          className="mt-5 inline-flex items-center gap-2 rounded-md bg-[#0D0D0D] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#FFD600] hover:text-[#0D0D0D] transition-colors"
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
    return (
      <div className="min-h-screen bg-[#FAFAF8] flex items-center justify-center">
        <div className="text-sm font-sans text-[#6B6B6B]">Checking access...</div>
      </div>
    );
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
    return (
      <div className="min-h-screen bg-[#FAFAF8] flex items-center justify-center">
        <div className="text-sm font-sans text-[#6B6B6B]">Checking access...</div>
      </div>
    );
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
