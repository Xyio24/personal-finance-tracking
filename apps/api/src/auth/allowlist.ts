/** Parse a comma separated list like "a@x.com, B@y.com" into normalized emails. */
export function parseEmailList(raw: string): string[] {
  return raw
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean)
}

export function isEmailAllowed(email: string, allowed: readonly string[]): boolean {
  return allowed.includes(email.trim().toLowerCase())
}
