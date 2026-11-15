/**
 * Postgres refused a delete because other rows still point at the row (foreign key violation,
 * SQLSTATE 23503). Drizzle may wrap the driver error, so the whole `cause` chain is checked.
 */
export function isStillReferenced(error: unknown): boolean {
  for (let current = error; current; current = (current as { cause?: unknown }).cause) {
    if ((current as { code?: unknown }).code === '23503') return true
  }
  return false
}
