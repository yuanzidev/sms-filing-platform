import { create } from 'zustand'
import type { UserPublic } from '@/lib/auth'

interface AuthState {
  auth: {
    user: UserPublic | null
    setUser: (user: UserPublic | null) => void
    accessToken: string | null
    setAccessToken: (accessToken: string) => void
    resetAccessToken: () => void
    reset: () => void
  }
}

export const useAuthStore = create<AuthState>()((set) => {
  const initToken = localStorage.getItem('access_token')
  return {
    auth: {
      user: null,
      setUser: (user) =>
        set((state) => ({ ...state, auth: { ...state.auth, user } })),
      accessToken: initToken,
      setAccessToken: (accessToken) =>
        set((state) => {
          localStorage.setItem('access_token', accessToken)
          return { ...state, auth: { ...state.auth, accessToken } }
        }),
      resetAccessToken: () =>
        set((state) => {
          localStorage.removeItem('access_token')
          return { ...state, auth: { ...state.auth, accessToken: null } }
        }),
      reset: () =>
        set((state) => {
          localStorage.removeItem('access_token')
          return {
            ...state,
            auth: { ...state.auth, user: null, accessToken: null },
          }
        }),
    },
  }
})

// export const useAuth = () => useAuthStore((state) => state.auth)
