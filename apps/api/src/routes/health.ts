import { Hono } from 'hono'
import { sql } from '../db/client'

export const healthRoutes = new Hono()

/** Used by the Docker healthcheck. Reports 503 when the database is unreachable. */
healthRoutes.get('/', async (c) => {
  try {
    await sql`select 1`
    return c.json({ status: 'ok' })
  } catch {
    return c.json({ status: 'db_unavailable' }, 503)
  }
})
