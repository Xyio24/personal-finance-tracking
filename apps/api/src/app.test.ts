import { describe, expect, it } from 'vitest'
import { createApp } from './app'
import { hashToken } from './auth/session'

// These requests never reach the database: each one is rejected or answered before any query.
const app = createApp()
const origin = 'http://localhost:5173'

describe('GET /api/me', () => {
  it('returns 401 without a session cookie', async () => {
    const res = await app.request('/api/me')
    expect(res.status).toBe(401)
    expect(await res.json()).toEqual({ error: 'unauthorized' })
  })
})

describe('GET /api/auth/google', () => {
  it('redirects to Google with PKCE and sets short-lived httpOnly state cookies', async () => {
    const res = await app.request('/api/auth/google')
    expect(res.status).toBe(302)

    const location = new URL(res.headers.get('location') ?? '')
    expect(location.origin).toBe('https://accounts.google.com')
    expect(location.searchParams.get('client_id')).toBe('test-client-id')
    expect(location.searchParams.get('redirect_uri')).toBe(`${origin}/api/auth/google/callback`)
    expect(location.searchParams.get('code_challenge_method')).toBe('S256')
    expect(location.searchParams.get('scope')).toBe('openid email profile')

    const cookies = res.headers.getSetCookie()
    const stateCookie = cookies.find((c) => c.startsWith('oauth_state='))
    expect(stateCookie).toMatch(/HttpOnly/)
    expect(stateCookie).toMatch(/Max-Age=600/)
    expect(stateCookie).toContain(`oauth_state=${location.searchParams.get('state')}`)
    expect(cookies.some((c) => c.startsWith('oauth_code_verifier='))).toBe(true)
  })
})

describe('GET /api/auth/google/callback', () => {
  it('rejects a state that does not match the cookie', async () => {
    const res = await app.request('/api/auth/google/callback?code=abc&state=forged', {
      headers: { cookie: 'oauth_state=real; oauth_code_verifier=v' },
    })
    expect(res.status).toBe(302)
    expect(res.headers.get('location')).toBe('/login?error=invalid_state')
  })

  it('treats a Google error (user cancelled) as cancelled', async () => {
    const res = await app.request('/api/auth/google/callback?error=access_denied')
    expect(res.headers.get('location')).toBe('/login?error=cancelled')
  })
})

describe('POST /api/auth/logout', () => {
  it('blocks cross-site form posts (CSRF)', async () => {
    const res = await app.request('/api/auth/logout', {
      method: 'POST',
      headers: {
        origin: 'https://evil.example',
        'content-type': 'application/x-www-form-urlencoded',
      },
    })
    expect(res.status).toBe(403)
  })

  it('succeeds from the app origin', async () => {
    const res = await app.request('/api/auth/logout', { method: 'POST', headers: { origin } })
    expect(res.status).toBe(204)
  })
})

describe('general', () => {
  it('answers unknown API routes with a JSON 404', async () => {
    const res = await app.request('/api/does-not-exist')
    expect(res.status).toBe(404)
    expect(await res.json()).toEqual({ error: 'not_found' })
  })

  it('sends security headers', async () => {
    const res = await app.request('/api/me')
    expect(res.headers.get('x-content-type-options')).toBe('nosniff')
    expect(res.headers.get('content-security-policy')).toContain("frame-ancestors 'none'")
  })
})

describe('hashToken', () => {
  it('is deterministic and never returns the raw token', () => {
    expect(hashToken('abc')).toBe(hashToken('abc'))
    expect(hashToken('abc')).not.toContain('abc')
    expect(hashToken('abc')).toHaveLength(64)
  })
})
