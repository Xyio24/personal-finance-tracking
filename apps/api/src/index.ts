import { serve } from '@hono/node-server'
import { createApp } from './app'
import { sql } from './db/client'
import { runMigrations } from './db/migrate'
import { env } from './env'

await runMigrations()

const server = serve({ fetch: createApp().fetch, hostname: env.HOST, port: env.PORT }, (info) => {
  console.log(`API ready on http://${env.HOST}:${info.port} (${env.NODE_ENV})`)
})

function shutdown() {
  server.close()
  sql.end({ timeout: 5 }).finally(() => process.exit(0))
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
