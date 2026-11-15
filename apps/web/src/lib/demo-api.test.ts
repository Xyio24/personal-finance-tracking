import {
  type Account,
  type Category,
  type MonthlyTotal,
  monthsBetween,
  shiftMonth,
  type Transaction,
  toMonthKey,
} from '@finance/shared'
import { beforeEach, describe, expect, it } from 'vitest'
import { demoRequest, resetDemoData } from './demo-api'
import { ApiError } from './errors'

beforeEach(resetDemoData)

const post = <T>(path: string, body: unknown) =>
  demoRequest<T>(path, { method: 'POST', body: JSON.stringify(body) })

async function lookups() {
  const accounts = await demoRequest<Account[]>('/accounts')
  const categories = await demoRequest<Category[]>('/categories')
  const byName = <T extends { name: string }>(list: T[], name: string) => {
    const item = list.find((i) => i.name === name)
    if (!item) throw new Error(`missing ${name}`)
    return item
  }
  return {
    cash: byName(accounts, 'Tunai'),
    gopay: byName(accounts, 'GoPay'),
    food: byName(categories, 'Makan & Minum'),
    salary: byName(categories, 'Gaji'),
  }
}

describe('demo API', () => {
  it('starts with example accounts, categories and this month’s transactions', async () => {
    const { cash } = await lookups()
    expect(cash.balance).not.toBe(cash.initialBalance)
    const month = toMonthKey(new Date())
    const list = await demoRequest<Transaction[]>(`/transactions?month=${month}`)
    expect(list.length).toBeGreaterThan(0)
    expect([...list].sort((a, b) => b.date.localeCompare(a.date))).toEqual(list)
  })

  it('moves balances like the real API', async () => {
    const { cash, gopay, food } = await lookups()
    await post('/transactions', {
      type: 'expense',
      amount: 10_000,
      accountId: cash.id,
      categoryId: food.id,
      date: '2026-11-15',
    })
    await post('/transactions', {
      type: 'transfer',
      amount: 5_000,
      accountId: cash.id,
      toAccountId: gopay.id,
      date: '2026-11-15',
    })
    const after = await demoRequest<Account[]>('/accounts')
    expect(after.find((a) => a.id === cash.id)?.balance).toBe(cash.balance - 15_000)
    expect(after.find((a) => a.id === gopay.id)?.balance).toBe(gopay.balance + 5_000)
  })

  it('applies the same rules as the server', async () => {
    const { cash, salary } = await lookups()
    const rejects = (promise: Promise<unknown>, code: string) =>
      expect(promise).rejects.toSatisfy((e) => e instanceof ApiError && e.message === code)

    await rejects(
      post('/transactions', {
        type: 'expense',
        amount: 1,
        accountId: cash.id,
        categoryId: salary.id,
        date: '2026-11-15',
      }),
      'invalid_category',
    )
    await rejects(post('/accounts', { name: '', type: 'cash', initialBalance: 0 }), 'invalid_input')
    await rejects(demoRequest(`/accounts/${cash.id}`, { method: 'DELETE' }), 'in_use')
  })

  it('never hands out its internal objects', async () => {
    const [first] = await demoRequest<Account[]>('/accounts')
    if (first) first.name = 'changed outside'
    const [again] = await demoRequest<Account[]>('/accounts')
    expect(again?.name).not.toBe('changed outside')
  })
})

describe('demo API search and reports', () => {
  it('searches notes and category names across months', async () => {
    const results = await demoRequest<Transaction[]>('/transactions?q=gaji')
    expect(results.length).toBeGreaterThan(2)
    expect(results.every((t) => t.type === 'income')).toBe(true)
    expect([...results].sort((a, b) => b.date.localeCompare(a.date))).toEqual(results)
  })

  it('applies filters like the server', async () => {
    const { gopay } = await lookups()
    const month = toMonthKey(new Date())
    const list = await demoRequest<Transaction[]>(
      `/transactions?month=${month}&accountId=${gopay.id}`,
    )
    expect(list.length).toBeGreaterThan(0)
    expect(list.every((t) => t.accountId === gopay.id || t.toAccountId === gopay.id)).toBe(true)
  })

  it('reports six zero-filled months with a visible trend', async () => {
    const to = toMonthKey(new Date())
    const from = shiftMonth(to, -5)
    const report = await demoRequest<MonthlyTotal[]>(`/reports/monthly?from=${from}&to=${to}`)
    expect(report.map((r) => r.month)).toEqual(monthsBetween(from, to))
    expect(report.filter((r) => r.expense > 0).length).toBeGreaterThanOrEqual(5)
  })
})
