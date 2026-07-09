import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '../lib/supabase';

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      profile: null,
      isLoading: true,

      applyAdminOverride: (profile, user) => {
        if (!profile) return null;
        const resolvedEmail = profile?.email || user?.email || get().user?.email || null;
        const shouldBeAdmin = resolvedEmail === 'contactus.mayank@gmail.com';

        return {
          ...profile,
          email: resolvedEmail,
          role: shouldBeAdmin ? 'admin' : profile.role,
        };
      },
      
      setUser: (user) => set({ user }),
      
      setProfile: (profile) => set((state) => ({
        profile: get().applyAdminOverride(profile, state.user),
      })),

      setAuth: (user, profile) => set({
        user,
        profile: get().applyAdminOverride(profile, user),
      }),
      
      updateProfile: (updates) => set((state) => ({ 
        profile: state.profile ? { ...state.profile, ...updates } : null 
      })),
      
      logout: async () => {
        await supabase.auth.signOut();
        set({ user: null, profile: null });
      },
      
      setIsLoading: (isLoading) => set({ isLoading }),
      
      isAdmin: () => get().profile?.role === 'admin',
      isStudent: () => get().profile?.role === 'student',
      isProfessor: () => get().profile?.role === 'professor',
      isCanteenOwner: () => get().profile?.role === 'canteen_owner',
      isPrintShop: () => get().profile?.role === 'print_shop',
    }),
    {
      name: 'campus-blink-auth',
    }
  )
);
