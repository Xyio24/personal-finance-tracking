import { randomUUID } from 'node:crypto'
import { createApp } from '../app'
import { createSession } from '../auth/session'
import { db, sql } from '../db/client'
import { users } from '../db/schema'

export const app = createApp()

/** Empties every table (they all hang off users). */
export async function resetDatabase() {
  await sql`truncate table users cascade`
}

type JsonResponse<T> = { status: number; body: T }

/**
 * Creates a user with a live session and returns a small client that calls the API as them.
 * The email must be in ALLOWED_EMAILS of the test env (owner@ or second@example.com).
 */
export async function signIn(email = 'owner@example.com') {
  const [user] = await db
    .insert(users)
    .values({ googleSub: randomUUID(), email, name: 'Test User' })
    .returning()
  if (!user) throw new Error('Could not create test user')
  const { token } = await createSession(user.id)

  async function call<T = unknown>(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<JsonResponse<T>> {
    const res = await app.request(`/api${path}`, {
      method,
      headers: { cookie: `session=${token}`, 'content-type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
    const text = await res.text()
    return { status: res.status, body: (text ? JSON.parse(text) : null) as T }
  }

  return {
    user,
    get: <T = unknown>(path: string) => call<T>('GET', path),
    post: <T = unknown>(path: string, body: unknown) => call<T>('POST', path, body),
    put: <T = unknown>(path: string, body: unknown) => call<T>('PUT', path, body),
    patch: <T = unknown>(path: string, body: unknown) => call<T>('PATCH', path, body),
    del: <T = unknown>(path: string) => call<T>('DELETE', path),
  }
}

export type TestClient = Awaited<ReturnType<typeof signIn>>
