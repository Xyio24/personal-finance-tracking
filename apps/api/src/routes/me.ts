import type { User } from '@finance/shared'
import { Hono } from 'hono'
import { type AuthEnv, requireAuth } from '../middleware/auth'

export const meRoutes = new Hono<AuthEnv>()

meRoutes.use(requireAuth)

meRoutes.get('/', (c) => {
  const { id, email, name, avatarUrl } = c.get('user')
  return c.json({ id, email, name, avatarUrl } satisfies User)
})
