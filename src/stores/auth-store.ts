import { create } from 'zustand'
import { api } from '@/lib/api'

interface User {
  id: string
  email: string
  name: string | null
  avatar: string | null
  createdAt: string
}

interface AuthState {
  user: User | null
  token: string | null
  isLoading: boolean
  error: string | null
  isAuthenticated: boolean

  initialize: () => Promise<void>
  login: (email: string, password: string) => Promise<void>
  register: (email: string, name: string, password: string) => Promise<void>
  logout: () => void
  clearError: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isLoading: false,
  error: null,
  isAuthenticated: false,

  initialize: async () => {
    const token = localStorage.getItem('auth_token')
    if (!token) return

    api.setToken(token)
    set({ isLoading: true })

    try {
      const user = await api.getMe()
      set({ user, token, isAuthenticated: true, isLoading: false })
    } catch {
      api.setToken(null)
      set({ user: null, token: null, isAuthenticated: false, isLoading: false })
    }
  },

  login: async (email, password) => {
    set({ isLoading: true, error: null })
    try {
      const { user, token } = await api.login(email, password)
      api.setToken(token)
      set({ user, token, isAuthenticated: true, isLoading: false })
    } catch (error: any) {
      set({ error: error.message || 'Login failed', isLoading: false })
      throw error
    }
  },

  register: async (email, name, password) => {
    set({ isLoading: true, error: null })
    try {
      const { user, token } = await api.register(email, name, password)
      api.setToken(token)
      set({ user, token, isAuthenticated: true, isLoading: false })
    } catch (error: any) {
      set({ error: error.message || 'Registration failed', isLoading: false })
      throw error
    }
  },

  logout: () => {
    api.setToken(null)
    set({ user: null, token: null, isAuthenticated: false })
  },

  clearError: () => set({ error: null }),
}))
