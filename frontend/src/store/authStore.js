import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { supabase } from '../lib/supabase';

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      profile: null,
      isLoading: true,
      
      setUser: (user) => set({ user }),
      
      setProfile: (profile) => set({ profile }),

      setAuth: (user, profile) => set({
        user,
        profile,
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
      storage: createJSONStorage(() => sessionStorage),
    }
  )
);
