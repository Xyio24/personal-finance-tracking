import type { Account, Category, MonthlyTotal } from '@finance/shared'
import { beforeEach, describe, expect, it } from 'vitest'
import { ensureUserDefaults } from '../services/defaults'
import { resetDatabase, signIn } from '../test/helpers'

beforeEach(resetDatabase)

async function setup(email?: string) {
  const client = await signIn(email)
  await ensureUserDefaults(client.user.id)
  const { body: bank } = await client.post<Account>('/accounts', {
    name: 'BCA',
    type: 'bank',
    initialBalance: 0,
  })
  const cash = (await client.get<Account[]>('/accounts')).body.find((a) => a.name === 'Tunai')
  const list = (await client.get<Category[]>('/categories')).body
  const food = list.find((c) => c.name === 'Makan & Minum')
  const salary = list.find((c) => c.name === 'Gaji')
  if (!cash || !food || !salary) throw new Error('defaults missing')
  return { client, bank, cash, food, salary }
}

describe('GET /api/reports/monthly', () => {
  it('totals income and expense per month, zero-filled, ignoring transfers', async () => {
    const { client, bank, cash, food, salary } = await setup()
    const add = (body: Record<string, unknown>) => client.post('/transactions', body)
    await add({
      type: 'income',
      amount: 8_000_000,
      accountId: bank.id,
      categoryId: salary.id,
      date: '2026-09-25',
    })
    await add({
      type: 'expense',
      amount: 40_000,
      accountId: cash.id,
      categoryId: food.id,
      date: '2026-09-30',
    })
    await add({
      type: 'expense',
      amount: 60_000,
      accountId: cash.id,
      categoryId: food.id,
      date: '2026-11-01',
    })
    await add({
      type: 'expense',
      amount: 15_000,
      accountId: cash.id,
      categoryId: food.id,
      date: '2026-11-30',
    })
    await add({
      type: 'transfer',
      amount: 500_000,
      accountId: bank.id,
      toAccountId: cash.id,
      date: '2026-11-02',
    })
    await add({
      type: 'expense',
      amount: 999,
      accountId: cash.id,
      categoryId: food.id,
      date: '2026-12-01',
    })

    const { status, body } = await client.get<MonthlyTotal[]>(
      '/reports/monthly?from=2026-08&to=2026-11',
    )
    expect(status).toBe(200)
    expect(body).toEqual([
      { month: '2026-08', income: 0, expense: 0 },
      { month: '2026-09', income: 8_000_000, expense: 40_000 },
      { month: '2026-10', income: 0, expense: 0 },
      { month: '2026-11', income: 0, expense: 75_000 },
    ])
  })

  it("only counts the signed-in user's entries", async () => {
    const owner = await setup()
    await owner.client.post('/transactions', {
      type: 'expense',
      amount: 10_000,
      accountId: owner.cash.id,
      categoryId: owner.food.id,
      date: '2026-11-10',
    })
    const other = await setup('second@example.com')
    const { body } = await other.client.get<MonthlyTotal[]>(
      '/reports/monthly?from=2026-11&to=2026-11',
    )
    expect(body).toEqual([{ month: '2026-11', income: 0, expense: 0 }])
  })

  it('validates the range', async () => {
    const { client } = await setup()
    expect((await client.get('/reports/monthly?from=2026-11&to=2026-10')).status).toBe(400)
    expect((await client.get('/reports/monthly?from=2024-01&to=2026-11')).status).toBe(400)
    expect((await client.get('/reports/monthly?from=2026-11')).status).toBe(400)
  })
})
