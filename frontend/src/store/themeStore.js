import { create } from 'zustand'

export const useThemeStore = create(() => ({
  theme: 'light',
  isDark: false,

  initTheme: () => {
    document.documentElement.setAttribute('data-theme', 'light')
    document.documentElement.classList.remove('dark')
  },

  setTheme: () => {},
  toggleTheme: () => {}
}))
