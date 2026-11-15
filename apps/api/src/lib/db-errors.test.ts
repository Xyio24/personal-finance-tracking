import { describe, expect, it } from 'vitest'
import { isStillReferenced } from './db-errors'

describe('isStillReferenced', () => {
  it('recognises a foreign key violation, also when wrapped', () => {
    const driverError = Object.assign(new Error('violates foreign key constraint'), {
      code: '23503',
    })
    expect(isStillReferenced(driverError)).toBe(true)
    expect(isStillReferenced(new Error('Failed query', { cause: driverError }))).toBe(true)
  })

  it('ignores every other error', () => {
    expect(isStillReferenced(Object.assign(new Error('unique'), { code: '23505' }))).toBe(false)
    expect(isStillReferenced(new Error('boom'))).toBe(false)
    expect(isStillReferenced(undefined)).toBe(false)
  })
})
