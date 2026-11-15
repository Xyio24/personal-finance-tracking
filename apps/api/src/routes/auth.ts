import { decodeIdToken, generateCodeVerifier, generateState } from 'arctic'
import { type Context, Hono } from 'hono'
import { deleteCookie, getCookie, setCookie } from 'hono/cookie'
import { isEmailAllowed } from '../auth/allowlist'
import { GOOGLE_SCOPES, type GoogleClaims, google, googleClaimsSchema } from '../auth/google'
import {
  createSession,
  deleteExpiredSessions,
  deleteSessionCookie,
  getSessionToken,
  invalidateSession,
  setSessionCookie,
} from '../auth/session'
import { db } from '../db/client'
import { users } from '../db/schema'
import { env, isSecureCookie } from '../env'

const STATE_COOKIE = 'oauth_state'
const VERIFIER_COOKIE = 'oauth_code_verifier'
const oauthCookie = {
  httpOnly: true,
  secure: isSecureCookie,
  // Lax still sends the cookie on Google's top-level redirect back to our callback.
  sameSite: 'Lax',
  path: '/api/auth',
  maxAge: 10 * 60,
} as const

export type LoginError = 'cancelled' | 'invalid_state' | 'oauth_failed' | 'not_allowed'

const loginFailed = (c: Context, error: LoginError) => c.redirect(`/login?error=${error}`)

export const authRoutes = new Hono()

/** Step 1: send the browser to Google's consent screen. */
authRoutes.get('/google', (c) => {
  const state = generateState()
  const codeVerifier = generateCodeVerifier()
  const url = google.createAuthorizationURL(state, codeVerifier, GOOGLE_SCOPES)
  url.searchParams.set('prompt', 'select_account')

  setCookie(c, STATE_COOKIE, state, oauthCookie)
  setCookie(c, VERIFIER_COOKIE, codeVerifier, oauthCookie)
  return c.redirect(url.toString())
})

/** Step 2: Google redirects back here with a one-time code. */
authRoutes.get('/google/callback', async (c) => {
  const { code, state, error } = c.req.query()
  const storedState = getCookie(c, STATE_COOKIE)
  const codeVerifier = getCookie(c, VERIFIER_COOKIE)
  deleteCookie(c, STATE_COOKIE, { path: oauthCookie.path, secure: isSecureCookie })
  deleteCookie(c, VERIFIER_COOKIE, { path: oauthCookie.path, secure: isSecureCookie })

  if (error) return loginFailed(c, 'cancelled')
  if (!code || !state || !storedState || !codeVerifier || state !== storedState) {
    return loginFailed(c, 'invalid_state')
  }

  let claims: GoogleClaims
  try {
    const tokens = await google.validateAuthorizationCode(code, codeVerifier)
    claims = googleClaimsSchema.parse(decodeIdToken(tokens.idToken()))
  } catch (err) {
    console.error('Google OAuth failed:', err instanceof Error ? err.message : 'unknown error')
    return loginFailed(c, 'oauth_failed')
  }

  if (!claims.email_verified || !isEmailAllowed(claims.email, env.ALLOWED_EMAILS)) {
    console.warn('Login rejected: Google account is not in ALLOWED_EMAILS')
    return loginFailed(c, 'not_allowed')
  }

  const profile = {
    email: claims.email.toLowerCase(),
    name: claims.name ?? null,
    avatarUrl: claims.picture ?? null,
  }
  const [user] = await db
    .insert(users)
    .values({ googleSub: claims.sub, ...profile })
    .onConflictDoUpdate({ target: users.googleSub, set: { ...profile, updatedAt: new Date() } })
    .returning({ id: users.id })
  if (!user) throw new Error('User upsert returned no row')

  await deleteExpiredSessions()
  const session = await createSession(user.id)
  setSessionCookie(c, session.token, session.expiresAt)
  return c.redirect('/')
})

authRoutes.post('/logout', async (c) => {
  const token = getSessionToken(c)
  if (token) await invalidateSession(token)
  deleteSessionCookie(c)
  return c.body(null, 204)
})
