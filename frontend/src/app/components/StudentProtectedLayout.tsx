import React, { useEffect, useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router';
import { useAuthStore } from '../../store/authStore';
import { StudentLayout } from './StudentLayout';
import { PageSkeleton } from './ui/PageSkeleton';

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

  return <StudentLayout />;
};

export const StudentProtectedLayout = ProtectedRoute;
