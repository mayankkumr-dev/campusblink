import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useThemeStore = create(
  persist(
    (set, get) => ({
      theme: 'light',
      isDark: false,

      initTheme: () => {
        set({ isDark: false, theme: 'light' })
        document.documentElement.setAttribute('data-theme', 'light')
      },

      setTheme: (theme) => {
        set({ theme: 'light', isDark: false })
        document.documentElement.setAttribute('data-theme', 'light')
      },

      toggleTheme: () => {
        // Disabled: App is enforced light mode only.
      }
    }),
    {
      name: 'campus-blink-theme',
      partialize: (state) => ({ theme: state.theme })
    }
  )
)
