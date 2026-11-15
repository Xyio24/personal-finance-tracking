import { createMiddleware } from 'hono/factory'
import { isEmailAllowed } from '../auth/allowlist'
import {
  deleteSessionCookie,
  getSessionToken,
  invalidateSession,
  setSessionCookie,
  validateSessionToken,
} from '../auth/session'
import type { UserRow } from '../db/schema'
import { env } from '../env'

export type AuthEnv = {
  Variables: {
    user: UserRow
  }
}

/** Rejects the request with 401 unless it carries a valid session for an allowed user. */
export const requireAuth = createMiddleware<AuthEnv>(async (c, next) => {
  const token = getSessionToken(c)
  if (!token) return c.json({ error: 'unauthorized' }, 401)

  const result = await validateSessionToken(token)
  if (!result) {
    deleteSessionCookie(c)
    return c.json({ error: 'unauthorized' }, 401)
  }

  // Removing an email from ALLOWED_EMAILS also kicks out sessions that already exist.
  if (!isEmailAllowed(result.user.email, env.ALLOWED_EMAILS)) {
    await invalidateSession(token)
    deleteSessionCookie(c)
    return c.json({ error: 'unauthorized' }, 401)
  }

  if (result.renewed) setSessionCookie(c, token, result.session.expiresAt)
  c.set('user', result.user)
  await next()
})
