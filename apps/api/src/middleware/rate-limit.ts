import type { Context } from 'hono'
import { createMiddleware } from 'hono/factory'

type Options = {
  windowMs: number
  max: number
}

/**
 * Tiny in-memory fixed-window rate limiter. Good enough for a single-instance app; swap for a
 * Redis-backed limiter if the API ever runs on more than one instance.
 */
export function rateLimit({ windowMs, max }: Options) {
  const hits = new Map<string, { count: number; resetAt: number }>()

  return createMiddleware(async (c, next) => {
    const now = Date.now()
    const key = clientIp(c)

    let entry = hits.get(key)
    if (!entry || entry.resetAt <= now) {
      entry = { count: 0, resetAt: now + windowMs }
      hits.set(key, entry)
    }
    entry.count++

    if (hits.size > 10_000) {
      for (const [k, v] of hits) if (v.resetAt <= now) hits.delete(k)
    }

    if (entry.count > max) {
      c.header('Retry-After', String(Math.ceil((entry.resetAt - now) / 1000)))
      return c.json({ error: 'too_many_requests' }, 429)
    }

    await next()
  })
}

/**
 * The app port is only bound to localhost and reached through Cloudflare Tunnel, so the
 * CF-Connecting-IP header set by Cloudflare is trustworthy here.
 */
function clientIp(c: Context): string {
  return (
    c.req.header('cf-connecting-ip') ??
    c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ??
    'unknown'
  )
}
