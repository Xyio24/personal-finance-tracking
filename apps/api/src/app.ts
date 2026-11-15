import { serveStatic } from '@hono/node-server/serve-static'
import { type Context, Hono } from 'hono'
import { csrf } from 'hono/csrf'
import { HTTPException } from 'hono/http-exception'
import { secureHeaders } from 'hono/secure-headers'
import { env } from './env'
import { rateLimit } from './middleware/rate-limit'
import { requestLogger } from './middleware/request-logger'
import { accountRoutes } from './routes/accounts'
import { authRoutes } from './routes/auth'
import { categoryRoutes } from './routes/categories'
import { healthRoutes } from './routes/health'
import { meRoutes } from './routes/me'
import { reportRoutes } from './routes/reports'
import { transactionRoutes } from './routes/transactions'

export function createApp() {
  const app = new Hono()

  app.use(requestLogger)
  app.use(
    secureHeaders({
      contentSecurityPolicy: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        // Google profile pictures
        imgSrc: ["'self'", 'data:', 'https://*.googleusercontent.com'],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
        frameAncestors: ["'none'"],
      },
    }),
  )

  // Blocks cross-site form posts; JSON requests from other sites are already stopped by CORS.
  app.use('/api/*', csrf({ origin: env.APP_URL }))
  app.use('/api/auth/*', rateLimit({ windowMs: 15 * 60 * 1000, max: 30 }))

  app.route('/api/health', healthRoutes)
  app.route('/api/auth', authRoutes)
  app.route('/api/me', meRoutes)
  app.route('/api/accounts', accountRoutes)
  app.route('/api/categories', categoryRoutes)
  app.route('/api/transactions', transactionRoutes)
  app.route('/api/reports', reportRoutes)
  app.all('/api/*', (c) => c.json({ error: 'not_found' }, 404))

  // Production: the API also serves the built React app from the same origin.
  if (env.STATIC_DIR) {
    const root = env.STATIC_DIR
    const cacheHeaders = (path: string, c: Context) => {
      // Vite fingerprints files in /assets, so they can be cached forever.
      const immutable = path.includes('/assets/')
      c.header('Cache-Control', immutable ? 'public, max-age=31536000, immutable' : 'no-cache')
    }
    app.use('*', serveStatic({ root, onFound: cacheHeaders }))
    // SPA fallback: page paths (e.g. /tabungan) get index.html and React Router takes over.
    // Missing files (anything with an extension) stay a real 404.
    app.get(
      '*',
      async (c, next) => (/\.\w+$/.test(c.req.path) ? c.notFound() : next()),
      serveStatic({ root, path: 'index.html', onFound: cacheHeaders }),
    )
  }

  app.onError((err, c) => {
    if (err instanceof HTTPException) return err.getResponse()
    console.error(err)
    return c.json({ error: 'internal_error' }, 500)
  })

  return app
}
