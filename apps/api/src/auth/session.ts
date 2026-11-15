import { createHash, randomBytes } from 'node:crypto'
import { eq, lt } from 'drizzle-orm'
import type { Context } from 'hono'
import { deleteCookie, getCookie, setCookie } from 'hono/cookie'
import { db } from '../db/client'
import { sessions, users } from '../db/schema'
import { isSecureCookie } from '../env'

const DAY_MS = 24 * 60 * 60 * 1000
export const SESSION_TTL_MS = 30 * DAY_MS
/** Sliding expiry: a session used within its last 15 days is extended to a fresh 30 days. */
const RENEW_WITHIN_MS = 15 * DAY_MS

/**
 * Over HTTPS we use the "__Host-" prefix: browsers only accept it with Secure, Path=/ and no
 * Domain, so no other (sub)domain can set or overwrite the session cookie.
 */
export const SESSION_COOKIE = isSecureCookie ? '__Host-session' : 'session'

export function generateSessionToken(): string {
  return randomBytes(32).toString('base64url')
}

/** Only this hash is stored, so a leaked database dump can't be used to hijack a session. */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

export async function createSession(userId: string) {
  const token = generateSessionToken()
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS)
  await db.insert(sessions).values({ id: hashToken(token), userId, expiresAt })
  return { token, expiresAt }
}

export async function validateSessionToken(token: string) {
  const id = hashToken(token)
  const [row] = await db
    .select({ session: sessions, user: users })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(eq(sessions.id, id))
    .limit(1)

  if (!row) return null

  const now = Date.now()
  if (row.session.expiresAt.getTime() <= now) {
    await db.delete(sessions).where(eq(sessions.id, id))
    return null
  }

  let renewed = false
  if (row.session.expiresAt.getTime() - now < RENEW_WITHIN_MS) {
    row.session.expiresAt = new Date(now + SESSION_TTL_MS)
    await db.update(sessions).set({ expiresAt: row.session.expiresAt }).where(eq(sessions.id, id))
    renewed = true
  }

  return { ...row, renewed }
}

export async function invalidateSession(token: string) {
  await db.delete(sessions).where(eq(sessions.id, hashToken(token)))
}

export async function deleteExpiredSessions() {
  await db.delete(sessions).where(lt(sessions.expiresAt, new Date()))
}

export function getSessionToken(c: Context): string | undefined {
  return getCookie(c, SESSION_COOKIE)
}

export function setSessionCookie(c: Context, token: string, expiresAt: Date) {
  setCookie(c, SESSION_COOKIE, token, {
    httpOnly: true,
    secure: isSecureCookie,
    sameSite: 'Lax',
    path: '/',
    expires: expiresAt,
  })
}

export function deleteSessionCookie(c: Context) {
  deleteCookie(c, SESSION_COOKIE, { path: '/', secure: isSecureCookie })
}
