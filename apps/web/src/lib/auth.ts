import { type User, userSchema } from '@finance/shared'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useRef } from 'react'
import { useNavigate } from 'react-router'
import { ApiError, api } from './api'
import { demoSession, demoUser, isDemo } from './demo'

export const meKey = ['me'] as const

/** The logged-in user, or null when there is no valid session. */
export function useMe() {
  return useQuery({
    queryKey: meKey,
    queryFn: async (): Promise<User | null> => {
      if (isDemo) return demoSession.signedIn ? demoUser : null
      try {
        return userSchema.parse(await api('/me'))
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) return null
        throw err
      }
    },
    staleTime: 5 * 60 * 1000,
    retry: false,
  })
}

/**
 * Use inside routes wrapped by <RequireAuth>, where the user is guaranteed to exist. Keeps the
 * last known user while logging out: the cache is cleared a moment before the login page takes
 * over, and the page still on screen must not crash in between.
 */
export function useCurrentUser(): User {
  const { data } = useMe()
  const lastUser = useRef(data)
  if (data) lastUser.current = data
  if (!lastUser.current) throw new Error('useCurrentUser must be used inside <RequireAuth>')
  return lastUser.current
}

export function useLogout() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  return useMutation({
    mutationFn: async () => {
      if (isDemo) return demoSession.signOut()
      await api<void>('/auth/logout', { method: 'POST' })
    },
    onSettled: () => {
      queryClient.clear()
      navigate('/login', { replace: true })
    },
  })
}
