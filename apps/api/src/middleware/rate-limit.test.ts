import { Hono } from 'hono'
import { describe, expect, it } from 'vitest'
import { rateLimit } from './rate-limit'

function makeApp(max: number) {
  const app = new Hono()
  app.use(rateLimit({ windowMs: 60_000, max }))
  app.get('/', (c) => c.text('ok'))
  return app
}

describe('rateLimit', () => {
  it('returns 429 with Retry-After once the limit is exceeded', async () => {
    const app = makeApp(2)
    const headers = { 'cf-connecting-ip': '203.0.113.1' }

    expect((await app.request('/', { headers })).status).toBe(200)
    expect((await app.request('/', { headers })).status).toBe(200)

    const blocked = await app.request('/', { headers })
    expect(blocked.status).toBe(429)
    expect(Number(blocked.headers.get('retry-after'))).toBeGreaterThan(0)
  })

  it('counts each client IP separately', async () => {
    const app = makeApp(1)
    expect(
      (await app.request('/', { headers: { 'cf-connecting-ip': '203.0.113.1' } })).status,
    ).toBe(200)
    expect(
      (await app.request('/', { headers: { 'cf-connecting-ip': '203.0.113.2' } })).status,
    ).toBe(200)
  })
})
