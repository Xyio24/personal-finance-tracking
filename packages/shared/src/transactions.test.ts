import { describe, expect, it } from 'vitest'
import { transactionInputSchema } from './transactions'

const a = '0b6c5e4e-1c1a-4d4f-9a55-3f0e2d1b7a10'
const b = '7f1e2a3b-4c5d-4e6f-8a9b-0c1d2e3f4a5b'
const cat = '5d2f8c1a-9b3e-4a7d-8c6f-1e2d3c4b5a69'

describe('transactionInputSchema', () => {
  it('accepts an expense and normalizes the note', () => {
    const parsed = transactionInputSchema.parse({
      type: 'expense',
      amount: 25000,
      accountId: a,
      categoryId: cat,
      date: '2026-11-15',
      note: '  Nasi padang  ',
    })
    expect(parsed).toMatchObject({ type: 'expense', note: 'Nasi padang' })
  })

  it('rejects a transfer into the same account', () => {
    const result = transactionInputSchema.safeParse({
      type: 'transfer',
      amount: 1000,
      accountId: a,
      toAccountId: a,
      date: '2026-11-15',
    })
    expect(result.success).toBe(false)
  })

  it('requires a category for income and expense', () => {
    const result = transactionInputSchema.safeParse({
      type: 'income',
      amount: 1000,
      accountId: b,
      date: '2026-11-15',
    })
    expect(result.success).toBe(false)
  })

  it('rejects zero, fractional and malformed values', () => {
    for (const patch of [{ amount: 0 }, { amount: 10.5 }, { date: '15-11-2026' }]) {
      const result = transactionInputSchema.safeParse({
        type: 'expense',
        amount: 1000,
        accountId: a,
        categoryId: cat,
        date: '2026-11-15',
        ...patch,
      })
      expect(result.success).toBe(false)
    }
  })
})
