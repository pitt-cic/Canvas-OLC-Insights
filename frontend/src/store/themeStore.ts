import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { Log } from '../lib/logger'

type Theme = 'light' | 'dark'

interface ThemeState {
  theme: Theme
  toggle: () => void
  set: (t: Theme) => void
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: 'light',

      toggle: () => {
        const next = get().theme === 'dark' ? 'light' : 'dark'
        Log.info('THEME', `Toggle → ${next}`)
        set({ theme: next })
      },

      set: (t) => {
        Log.info('THEME', `Set → ${t}`)
        set({ theme: t })
      },
    }),
    { name: 'qa-theme' }
  )
)
