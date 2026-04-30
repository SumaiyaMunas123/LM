import { create } from 'zustand'
import type { Session, User } from '@supabase/supabase-js'

type AppUser = {
  id: string
  name: string | null
  email: string | null
  photoUrl: string | null
  role: 'student' | 'teacher' | 'admin'
}

type AuthState = {
  user: AppUser | null
  session: Session | null
  token: string | null
  isLoading: boolean
  setUser: (user: AppUser | null) => void
  setSession: (session: Session | null) => void
  clearAuth: () => void
}

function mapUser(user: User): AppUser {
  const metadata = user.user_metadata as Record<string, unknown> | undefined
  const role = metadata?.role === 'teacher' || metadata?.role === 'admin' ? metadata.role : 'student'

  return {
    id: user.id,
    name: typeof metadata?.full_name === 'string' ? metadata.full_name : typeof metadata?.name === 'string' ? metadata.name : null,
    email: user.email ?? null,
    photoUrl: typeof metadata?.avatar_url === 'string' ? metadata.avatar_url : typeof metadata?.picture === 'string' ? metadata.picture : null,
    role,
  }
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  session: null,
  token: null,
  isLoading: true,
  setUser: (user) => set({ user }),
  setSession: (session) =>
    set({
      session,
      token: session?.access_token ?? null,
      user: session ? mapUser(session.user) : null,
      isLoading: false,
    }),
  clearAuth: () => set({ user: null, session: null, token: null, isLoading: false }),
}))

export { mapUser }
