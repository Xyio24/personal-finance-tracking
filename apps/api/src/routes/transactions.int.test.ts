import type { Account, Category, Transaction } from '@finance/shared'
import { beforeEach, describe, expect, it } from 'vitest'
import { ensureUserDefaults } from '../services/defaults'
import { resetDatabase, signIn, type TestClient } from '../test/helpers'

beforeEach(resetDatabase)

/** A signed-in user with defaults, a bank account and handy lookups. */
async function setup(email?: string) {
  const client = await signIn(email)
  await ensureUserDefaults(client.user.id)
  const { body: bank } = await client.post<Account>('/accounts', {
    name: 'BCA',
    type: 'bank',
    initialBalance: 1_000_000,
  })
  const cash = (await client.get<Account[]>('/accounts')).body.find((a) => a.name === 'Tunai')
  const list = (await client.get<Category[]>('/categories')).body
  const food = list.find((c) => c.name === 'Makan & Minum')
  const salary = list.find((c) => c.name === 'Gaji')
  if (!cash || !food || !salary) throw new Error('defaults missing')
  return { client, bank, cash, food, salary }
}

const balances = async (client: TestClient) =>
  Object.fromEntries(
    (await client.get<Account[]>('/accounts')).body.map((a) => [a.name, a.balance]),
  )

describe('transactions API', () => {
  it('records income, expense and transfers and updates balances', async () => {
    const { client, bank, cash, food, salary } = await setup()

    const income = await client.post<Transaction>('/transactions', {
      type: 'income',
      amount: 5_000_000,
      accountId: bank.id,
      categoryId: salary.id,
      date: '2026-11-01',
    })
    expect(income.status).toBe(201)
    await client.post('/transactions', {
      type: 'transfer',
      amount: 300_000,
      accountId: bank.id,
      toAccountId: cash.id,
      date: '2026-11-02',
    })
    const expense = await client.post<Transaction>('/transactions', {
      type: 'expense',
      amount: 45_000,
      accountId: cash.id,
      categoryId: food.id,
      date: '2026-11-03',
      note: '  Nasi padang ',
    })
    expect(expense.body).toMatchObject({ note: 'Nasi padang', toAccountId: null })

    expect(await balances(client)).toEqual({
      Tunai: 300_000 - 45_000,
      BCA: 1_000_000 + 5_000_000 - 300_000,
    })
  })

  it('lists one month, newest first', async () => {
    const { client, cash, food } = await setup()
    const add = (date: string, amount: number) =>
      client.post('/transactions', {
        type: 'expense',
        amount,
        accountId: cash.id,
        categoryId: food.id,
        date,
      })
    await add('2026-10-31', 1)
    await add('2026-11-01', 2)
    await add('2026-11-30', 3)
    await add('2026-12-01', 4)

    const { body } = await client.get<Transaction[]>('/transactions?month=2026-11')
    expect(body.map((t) => t.amount)).toEqual([3, 2])
    expect((await client.get('/transactions?month=2026-13')).status).toBe(400)
    expect((await client.get('/transactions')).status).toBe(400)
  })

  it('refuses accounts and categories that do not fit', async () => {
    const { client, bank, cash, food, salary } = await setup()
    const other = await setup('second@example.com')
    const expense = { type: 'expense', amount: 1000, date: '2026-11-15' }

    const cases: [unknown, string][] = [
      [{ ...expense, accountId: other.cash.id, categoryId: food.id }, 'invalid_account'],
      [{ ...expense, accountId: cash.id, categoryId: other.food.id }, 'invalid_category'],
      [{ ...expense, accountId: cash.id, categoryId: salary.id }, 'invalid_category'],
      [
        {
          type: 'transfer',
          amount: 1000,
          date: '2026-11-15',
          accountId: bank.id,
          toAccountId: other.bank.id,
        },
        'invalid_account',
      ],
    ]
    for (const [body, error] of cases) {
      expect(await client.post('/transactions', body)).toEqual({ status: 400, body: { error } })
    }
    const sameAccount = await client.post('/transactions', {
      type: 'transfer',
      amount: 1000,
      date: '2026-11-15',
      accountId: bank.id,
      toAccountId: bank.id,
    })
    expect(sameAccount.body).toMatchObject({ error: 'invalid_input' })
  })

  it('blocks archived accounts for new entries but keeps old entries editable', async () => {
    const { client, cash, food } = await setup()
    const { body: entry } = await client.post<Transaction>('/transactions', {
      type: 'expense',
      amount: 20_000,
      accountId: cash.id,
      categoryId: food.id,
      date: '2026-11-10',
    })
    await client.patch(`/accounts/${cash.id}`, { archived: true })

    const fresh = await client.post('/transactions', {
      type: 'expense',
      amount: 1,
      accountId: cash.id,
      categoryId: food.id,
      date: '2026-11-11',
    })
    expect(fresh.body).toEqual({ error: 'archived_account' })

    const edited = await client.put<Transaction>(`/transactions/${entry.id}`, {
      type: 'expense',
      amount: 25_000,
      accountId: cash.id,
      categoryId: food.id,
      date: '2026-11-10',
    })
    expect(edited).toMatchObject({ status: 200, body: { amount: 25_000 } })
  })

  it('edits a transaction into another type and deletes it', async () => {
    const { client, bank, cash, food } = await setup()
    const { body: entry } = await client.post<Transaction>('/transactions', {
      type: 'expense',
      amount: 50_000,
      accountId: bank.id,
      categoryId: food.id,
      date: '2026-11-10',
      note: 'Salah catat',
    })

    const asTransfer = await client.put<Transaction>(`/transactions/${entry.id}`, {
      type: 'transfer',
      amount: 50_000,
      accountId: bank.id,
      toAccountId: cash.id,
      date: '2026-11-10',
    })
    expect(asTransfer.body).toMatchObject({ type: 'transfer', categoryId: null, note: null })
    expect(await balances(client)).toEqual({ Tunai: 50_000, BCA: 950_000 })

    expect((await client.get<Transaction>(`/transactions/${entry.id}`)).body.id).toBe(entry.id)
    expect((await client.del(`/transactions/${entry.id}`)).status).toBe(204)
    expect((await client.get(`/transactions/${entry.id}`)).status).toBe(404)
    expect(await balances(client)).toEqual({ Tunai: 0, BCA: 1_000_000 })
  })

  it("keeps each user's transactions private", async () => {
    const { client, cash, food } = await setup()
    const other = await setup('second@example.com')
    const { body: entry } = await client.post<Transaction>('/transactions', {
      type: 'expense',
      amount: 10_000,
      accountId: cash.id,
      categoryId: food.id,
      date: '2026-11-10',
    })

    expect((await other.client.get<Transaction[]>('/transactions?month=2026-11')).body).toEqual([])
    expect((await other.client.get(`/transactions/${entry.id}`)).status).toBe(404)
    expect((await other.client.del(`/transactions/${entry.id}`)).status).toBe(404)
    const hijack = await other.client.put(`/transactions/${entry.id}`, {
      type: 'expense',
      amount: 1,
      accountId: other.cash.id,
      categoryId: other.food.id,
      date: '2026-11-10',
    })
    expect(hijack.status).toBe(404)
  })
})
