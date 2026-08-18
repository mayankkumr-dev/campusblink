import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

// Note: logout() no longer calls supabase.auth.signOut() directly.
// Sign-out is handled by Clerk (useClerk().signOut()) at the component level.
// Calling logout() here just clears the local store state.

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,       // Clerk user object (from useUser())
      profile: null,    // Supabase profile row (fetched by clerk_user_id or email)
      isLoading: true,

      setUser: (user) => set({ user }),

      setProfile: (profile) => set({ profile }),

      setAuth: (user, profile) => set({ user, profile }),

      updateProfile: (updates) => set((state) => ({
        profile: state.profile ? { ...state.profile, ...updates } : null,
      })),

      logout: () => {
        // Clear local state — actual Clerk sign-out is called from the UI
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
