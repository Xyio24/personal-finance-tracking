import { createMiddleware } from 'hono/factory'

/**
 * Logs method, path, status and duration. Unlike hono/logger it never logs the query string,
 * which on the OAuth callback contains the authorization code.
 */
export const requestLogger = createMiddleware(async (c, next) => {
  const start = performance.now()
  await next()
  const ms = Math.round(performance.now() - start)
  console.log(`${c.req.method} ${c.req.path} ${c.res.status} ${ms}ms`)
})
