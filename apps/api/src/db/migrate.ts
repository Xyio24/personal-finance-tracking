import path from 'node:path'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import { env } from '../env'
import { db } from './client'

/** Apply pending SQL migrations from the drizzle/ folder (relative to the working directory). */
export async function runMigrations() {
  await migrate(db, { migrationsFolder: path.resolve(env.MIGRATIONS_DIR) })
}
