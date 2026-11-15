// Remember the last wallet used, so the next entry starts there. Purely a convenience:
// storage may be unavailable (private mode), and then the first wallet is used.

const LAST_ACCOUNT_KEY = 'finance:last-account'

export function readLastAccount(): string | null {
  try {
    return localStorage.getItem(LAST_ACCOUNT_KEY)
  } catch {
    return null
  }
}

export function rememberAccount(id: string) {
  try {
    localStorage.setItem(LAST_ACCOUNT_KEY, id)
  } catch {
    // ignore: only a convenience
  }
}
