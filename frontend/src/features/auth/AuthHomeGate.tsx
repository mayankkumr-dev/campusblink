import React, { useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router';
import { useAuthStore } from '../../store/authStore';
import { LandingPage } from '../../app/components/LandingPage';

function resolveHomePath(role?: string | null, email?: string | null) {
  // No hardcoded admin email check
  const normalizedRole = String(role || '').toLowerCase();

  if (normalizedRole === 'admin') return '/admin';
  if (normalizedRole === 'professor') return '/professor';
  if (normalizedRole === 'canteen_owner') return '/canteen-dashboard';
  if (normalizedRole === 'print_shop') return '/print-dashboard';
  return '/student/home';
}

export const AuthHomeGate: React.FC = () => {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const profile = useAuthStore((state) => state.profile);
  const isLoading = useAuthStore((state) => state.isLoading);

  useEffect(() => {
    if (isLoading) return;
    if (user && profile) {
      navigate(resolveHomePath(profile.role, user.email || profile.email), { replace: true });
    }
  }, [isLoading, navigate, profile, user]);

  if (isLoading) {
    return <div className="min-h-screen bg-[var(--bg-primary)]" />;
  }

  if (user && profile) {
    return <Navigate to={resolveHomePath(profile.role, user.email || profile.email)} replace />;
  }

  return <LandingPage />;
};
