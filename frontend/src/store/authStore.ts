import { create } from 'zustand'
import { signIn, signOut, completeNewPassword, getSession, getIdToken } from '../lib/auth'

const DEV_BYPASS = import.meta.env.DEV

interface AuthState {
  isAuthenticated: boolean
  isLoading: boolean
  email: string | null
  error: string | null
  needsNewPassword: boolean

  checkSession: () => Promise<void>
  login: (email: string, password: string) => Promise<boolean>
  setNewPassword: (password: string) => Promise<boolean>
  logout: () => void
  clearError: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: DEV_BYPASS,
  isLoading: !DEV_BYPASS,
  email: null,
  error: null,
  needsNewPassword: false,

  checkSession: async () => {
    if (DEV_BYPASS) {
      set({ isAuthenticated: true, isLoading: false })
      return
    }
    const session = await getSession()
    set({
      isAuthenticated: session !== null && session.isValid(),
      isLoading: false,
    })
  },

  login: async (email, password) => {
    set({ error: null, isLoading: true })
    const result = await signIn(email, password)
    if (result.success) {
      set({ isAuthenticated: true, isLoading: false, email, needsNewPassword: false })
      return true
    }
    if (result.newPasswordRequired) {
      set({ needsNewPassword: true, isLoading: false, email })
      return false
    }
    set({ error: result.error || 'Login failed', isLoading: false })
    return false
  },

  setNewPassword: async (password) => {
    set({ error: null, isLoading: true })
    const result = await completeNewPassword(password)
    if (result.success) {
      set({ isAuthenticated: true, isLoading: false, needsNewPassword: false })
      return true
    }
    set({ error: result.error || 'Password change failed', isLoading: false })
    return false
  },

  logout: () => {
    signOut()
    set({ isAuthenticated: false, email: null, needsNewPassword: false })
  },

  clearError: () => set({ error: null }),
}))

export { getIdToken }
