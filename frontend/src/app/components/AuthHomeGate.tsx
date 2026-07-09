import React, { useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router';
import { useAuthStore } from '../../store/authStore';
import { LandingPage } from './LandingPage';

function resolveHomePath(role?: string | null) {
  const normalizedRole = String(role || '').toLowerCase();

  if (normalizedRole === 'professor') return '/professor';
  if (normalizedRole === 'admin') return '/admin';
  if (normalizedRole === 'canteen_owner') return '/canteen-dashboard';
  if (normalizedRole === 'print_shop') return '/print-dashboard';
  return '/student';
}

export const AuthHomeGate: React.FC = () => {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const profile = useAuthStore((state) => state.profile);
  const isLoading = useAuthStore((state) => state.isLoading);

  useEffect(() => {
    if (isLoading) return;
    if (user && profile) {
      navigate(resolveHomePath(profile.role), { replace: true });
    }
  }, [isLoading, navigate, profile, user]);

  if (isLoading) {
    return <div className="min-h-screen bg-[var(--bg-primary)]" />;
  }

  if (user && profile) {
    return <Navigate to={resolveHomePath(profile.role)} replace />;
  }

  return <LandingPage />;
};
