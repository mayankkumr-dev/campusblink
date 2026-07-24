import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SearchState {
  recentSearches: string[];
  addSearchTerm: (term: string) => void;
  removeSearchTerm: (term: string) => void;
  clearHistory: () => void;
}

export const useSearchStore = create<SearchState>()(
  persist(
    (set) => ({
      recentSearches: [],
      addSearchTerm: (term: string) =>
        set((state) => {
          const trimmedTerm = term.trim();
          if (!trimmedTerm) return state;

          const filtered = state.recentSearches.filter((t) => t !== trimmedTerm);
          return {
            recentSearches: [trimmedTerm, ...filtered].slice(0, 5),
          };
        }),
      removeSearchTerm: (term: string) =>
        set((state) => ({
          recentSearches: state.recentSearches.filter((t) => t !== term),
        })),
      clearHistory: () => set({ recentSearches: [] }),
    }),
    {
      name: 'campus-blink-search-history',
    }
  )
);
