import { sql } from './client'
import { runMigrations } from './migrate'

await runMigrations()
await sql.end()
console.log('Migrations applied')
