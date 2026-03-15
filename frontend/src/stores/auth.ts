import { create } from 'zustand'
import api from '../api/client'

interface Profile {
  displayName: string
  avatarUrl?: string
  totalXp: number
  totalWins: number
  totalDuels: number
  language: string
}

interface User {
  id: string
  username: string
  role: string
  profile: Profile
}

interface AuthState {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (username: string, email: string, password: string) => Promise<void>
  logout: () => void
  loadUser: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: true,

  login: async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password })
    localStorage.setItem('accessToken', data.accessToken)
    localStorage.setItem('refreshToken', data.refreshToken)
    set({ user: data.user })
  },

  register: async (username, email, password) => {
    const { data } = await api.post('/auth/register', { username, email, password })
    localStorage.setItem('accessToken', data.accessToken)
    localStorage.setItem('refreshToken', data.refreshToken)
    set({ user: data.user })
  },

  logout: () => {
    localStorage.clear()
    set({ user: null, loading: false })
  },

  loadUser: async () => {
    if (!localStorage.getItem('accessToken')) {
      set({ loading: false })
      return
    }
    try {
      const { data } = await api.get('/profile/me')
      set({ user: data, loading: false })
    } catch {
      localStorage.clear()
      set({ user: null, loading: false })
    }
  },
}))
