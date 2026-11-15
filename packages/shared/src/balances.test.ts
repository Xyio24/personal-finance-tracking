import { describe, expect, it } from 'vitest'
import { computeBalances, summarize } from './balances'

const accounts = [
  { id: 'cash', initialBalance: 100_000 },
  { id: 'bank', initialBalance: 1_000_000 },
]

describe('computeBalances', () => {
  it('applies income, expense and transfers to the right accounts', () => {
    const balances = computeBalances(accounts, [
      { type: 'income', amount: 500_000, accountId: 'bank', toAccountId: null },
      { type: 'expense', amount: 25_000, accountId: 'cash', toAccountId: null },
      { type: 'transfer', amount: 200_000, accountId: 'bank', toAccountId: 'cash' },
    ])
    expect(balances.get('cash')).toBe(100_000 - 25_000 + 200_000)
    expect(balances.get('bank')).toBe(1_000_000 + 500_000 - 200_000)
  })

  it('keeps the total unchanged by transfers', () => {
    const balances = computeBalances(accounts, [
      { type: 'transfer', amount: 50_000, accountId: 'cash', toAccountId: 'bank' },
    ])
    expect((balances.get('cash') ?? 0) + (balances.get('bank') ?? 0)).toBe(1_100_000)
  })

  it('allows balances to go negative', () => {
    const balances = computeBalances(accounts, [
      { type: 'expense', amount: 150_000, accountId: 'cash', toAccountId: null },
    ])
    expect(balances.get('cash')).toBe(-50_000)
  })
})

describe('summarize', () => {
  it('ignores transfers', () => {
    expect(
      summarize([
        { type: 'income', amount: 1000 },
        { type: 'expense', amount: 300 },
        { type: 'transfer', amount: 999 },
      ]),
    ).toEqual({ income: 1000, expense: 300, net: 700 })
  })
})
