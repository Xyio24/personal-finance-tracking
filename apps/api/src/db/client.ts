import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { env } from '../env'
import * as schema from './schema'

// postgres.js connects lazily, so importing this file never opens a connection by itself.
export const sql = postgres(env.DATABASE_URL, {
  max: 10,
  onnotice: () => {},
})

export const db = drizzle({ client: sql, schema })
