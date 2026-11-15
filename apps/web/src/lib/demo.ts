import type { User } from '@finance/shared'

/**
 * UI-only demo mode (`npm run dev:demo`, i.e. `vite --mode demo`): skips Google login with a
 * fake user so the interface can be previewed without OAuth credentials. It exposes nothing —
 * the API still requires a real session for every request, and normal builds never enable it.
 */
export const isDemo = import.meta.env.MODE === 'demo'

export const demoUser: User = {
  id: '00000000-0000-4000-8000-000000000000',
  email: 'demo@example.com',
  name: 'Demo',
  avatarUrl: null,
}

let signedIn = true

/** In-memory fake session so logout/login can be clicked through in the demo. */
export const demoSession = {
  get signedIn() {
    return signedIn
  },
  signIn() {
    signedIn = true
  },
  signOut() {
    signedIn = false
  },
}
