import { describe, expect, it } from 'vitest'
import { isEmailAllowed, parseEmailList } from './allowlist'

describe('parseEmailList', () => {
  it('trims, lowercases and drops empty entries', () => {
    expect(parseEmailList(' A@Example.com, ,b@example.com ,')).toEqual([
      'a@example.com',
      'b@example.com',
    ])
  })
})

describe('isEmailAllowed', () => {
  const allowed = parseEmailList('owner@example.com')

  it('matches case-insensitively', () => {
    expect(isEmailAllowed('Owner@Example.COM', allowed)).toBe(true)
  })

  it('rejects anyone not on the list', () => {
    expect(isEmailAllowed('stranger@example.com', allowed)).toBe(false)
    expect(isEmailAllowed('owner@example.com.evil.test', allowed)).toBe(false)
  })

  it('rejects everyone when the list is empty', () => {
    expect(isEmailAllowed('owner@example.com', [])).toBe(false)
  })
})
