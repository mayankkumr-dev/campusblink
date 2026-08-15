import { create } from 'zustand'

export const useThemeStore = create((set, get) => ({
  theme: typeof window !== 'undefined' ? (localStorage.getItem('theme') || 'light') : 'light',
  isDark: typeof window !== 'undefined' ? document.documentElement.classList.contains('dark') : false,

  initTheme: () => {
    if (typeof window === 'undefined') return
    const storedTheme = localStorage.getItem('theme') || 'light'
    const isDark = storedTheme === 'dark' || (storedTheme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
    if (isDark) {
      document.documentElement.classList.add('dark')
      document.documentElement.setAttribute('data-theme', 'dark')
      set({ theme: storedTheme, isDark: true })
    } else {
      document.documentElement.classList.remove('dark')
      document.documentElement.setAttribute('data-theme', 'light')
      set({ theme: storedTheme, isDark: false })
    }
  },

  setTheme: (newTheme) => {
    if (typeof window === 'undefined') return
    localStorage.setItem('theme', newTheme)
    const isDark = newTheme === 'dark' || (newTheme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
    if (isDark) {
      document.documentElement.classList.add('dark')
      document.documentElement.setAttribute('data-theme', 'dark')
    } else {
      document.documentElement.classList.remove('dark')
      document.documentElement.setAttribute('data-theme', 'light')
    }
    set({ theme: newTheme, isDark })
  },

  toggleTheme: () => {
    const current = get().theme
    const next = current === 'dark' ? 'light' : 'dark'
    get().setTheme(next)
  }
}))
