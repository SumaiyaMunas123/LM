import { create } from 'zustand'

type AuthUser = {
  id: string
  name: string | null
  email: string | null
  photoUrl: string | null
  role: 'student' | 'teacher' | 'admin'
}

type AuthState = {
  token: string | null
  user: AuthUser | null
  setSession: (token: string, user: AuthUser) => void
  clearSession: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  user: null,
  setSession: (token, user) => set({ token, user }),
  clearSession: () => set({ token: null, user: null }),
}))
