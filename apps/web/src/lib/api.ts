export class ApiError extends Error {
  readonly status: number

  constructor(status: number, code: string) {
    super(code)
    this.name = 'ApiError'
    this.status = status
  }
}

/** Fetch wrapper for our own API. Throws ApiError for non-2xx responses. */
export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers)
  headers.set('Accept', 'application/json')
  if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json')

  const res = await fetch(`/api${path}`, { ...init, headers, credentials: 'same-origin' })

  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: string } | null
    throw new ApiError(res.status, body?.error ?? res.statusText)
  }

  if (res.status === 204) return undefined as T
  return (await res.json()) as T
}
