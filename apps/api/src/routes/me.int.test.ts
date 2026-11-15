import { beforeEach, describe, expect, it } from 'vitest'
import { resetDatabase, signIn } from '../test/helpers'

beforeEach(resetDatabase)

describe('GET /api/me (database)', () => {
  it('returns the signed-in user for a valid session', async () => {
    const client = await signIn()
    const res = await client.get('/me')
    expect(res.status).toBe(200)
    expect(res.body).toEqual({
      id: client.user.id,
      email: 'owner@example.com',
      name: 'Test User',
      avatarUrl: null,
    })
  })
})
