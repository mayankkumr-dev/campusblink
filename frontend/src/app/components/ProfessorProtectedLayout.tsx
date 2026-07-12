import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router';
import { useAuthStore } from '../../store/authStore';
import { ProfessorLayout } from './ProfessorLayout';
import { PageSkeleton } from './ui/PageSkeleton';

export const ProfessorProtectedLayout: React.FC = () => {
  const location = useLocation();
  const user = useAuthStore((state) => state.user);
  const profile = useAuthStore((state) => state.profile);
  const isLoading = useAuthStore((state) => state.isLoading);
  const hasHydrated = (useAuthStore as any).persist?.hasHydrated?.() ?? true;

  // Loading skeleton state while profile is being fetched
  if (!hasHydrated || isLoading || (user && !profile)) {
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

  // Only professors and admins can access /professor/*
  // Redirect other roles to their own correct home
  if (profile.role !== 'professor' && profile.role !== 'admin') {
    const roleHome: Record<string, string> = {
      canteen_owner: '/canteen-dashboard',
      print_shop: '/print-dashboard',
      student: '/student/home',
      society: '/student/home',
    };
    return <Navigate to={roleHome[profile.role] || '/student/home'} replace />;
  }


  // Banned professors
  if (String(profile?.status || '').toLowerCase() === 'banned') {
    return <Navigate to="/account-restricted?status=banned" replace />;
  }

  // Admins bypass professor_status check
  if (profile.role === 'admin') {
    return <ProfessorLayout />;
  }

  const profStatus = String(profile.professor_status || 'pending').toLowerCase();

  // (1) If profile.professor_status === 'pending'
  if (profStatus === 'pending') {
    return <Navigate replace to="/professor/pending" />;
  }

  // (2) If profile.professor_status === 'rejected'
  if (profStatus === 'rejected') {
    return <Navigate replace to="/professor/rejected" />;
  }

  // (3) Only if professor_status === 'approved' render layout containing <Outlet/>
  if (profStatus === 'approved') {
    return <ProfessorLayout />;
  }

  return <Navigate replace to="/professor/pending" />;
};
