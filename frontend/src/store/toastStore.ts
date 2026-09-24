import { create } from 'zustand'

export type ToastType = 'success' | 'error' | 'info' | 'warning'

export interface Toast {
  id: string
  type: ToastType
  title: string
  message?: string
  createdAt: number
}

interface ToastState {
  toasts: Toast[]
  add: (type: ToastType, title: string, message?: string) => void
  remove: (id: string) => void
}

let counter = 0

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],

  add: (type, title, message) => {
    const id = `toast-${++counter}`
    set((s) => {
      const next = [...s.toasts, { id, type, title, message, createdAt: Date.now() }]
      return { toasts: next.slice(-3) }
    })
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }))
    }, type === 'error' ? 5000 : 3000)
  },

  remove: (id) => {
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }))
  },
}))

export const toast = {
  success: (title: string, message?: string) => useToastStore.getState().add('success', title, message),
  error: (title: string, message?: string) => useToastStore.getState().add('error', title, message),
  info: (title: string, message?: string) => useToastStore.getState().add('info', title, message),
  warning: (title: string, message?: string) => useToastStore.getState().add('warning', title, message),
}
