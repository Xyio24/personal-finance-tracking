import path from 'node:path'
import { drizzle } from 'drizzle-orm/postgres-js'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import postgres from 'postgres'
import { TEST_DATABASE_URL } from './env'

/** Creates the test database if needed and brings it to the latest migration. */
export default async function setup() {
  const url = new URL(TEST_DATABASE_URL)
  const dbName = url.pathname.slice(1)
  if (!/^[a-z0-9_]+$/.test(dbName)) throw new Error(`Unexpected test database name: ${dbName}`)

  const adminUrl = new URL(url)
  adminUrl.pathname = '/postgres'
  const admin = postgres(adminUrl.href, { max: 1, onnotice: () => {} })
  try {
    const [existing] = await admin`select 1 from pg_database where datname = ${dbName}`
    if (!existing) await admin.unsafe(`create database ${dbName}`)
  } catch (err) {
    throw new Error(
      `Cannot reach the test database (${url.host}). Start it with "npm run db:up" first.`,
      { cause: err },
    )
  } finally {
    await admin.end()
  }

  const sql = postgres(url.href, { max: 1, onnotice: () => {} })
  await migrate(drizzle({ client: sql }), { migrationsFolder: path.resolve('drizzle') })
  await sql.end()
}
