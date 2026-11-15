import { type Account, type Category, SEARCH_LIMIT, type Transaction } from '@finance/shared'
import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../db/client'
import { transactions } from '../db/schema'
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
  const bills = list.find((c) => c.name === 'Tagihan')
  const food = list.find((c) => c.name === 'Makan & Minum')
  const salary = list.find((c) => c.name === 'Gaji')
  if (!cash || !bills || !food || !salary) throw new Error('defaults missing')

  const add = (body: Record<string, unknown>) => client.post<Transaction>('/transactions', body)
  await add({
    type: 'expense',
    amount: 450_000,
    accountId: bank.id,
    categoryId: bills.id,
    date: '2026-09-03',
    note: 'Listrik September',
  })
  await add({
    type: 'expense',
    amount: 470_000,
    accountId: bank.id,
    categoryId: bills.id,
    date: '2026-11-03',
    note: 'LISTRIK november',
  })
  await add({
    type: 'expense',
    amount: 35_000,
    accountId: cash.id,
    categoryId: food.id,
    date: '2026-11-04',
    note: 'Diskon 50% bakso',
  })
  await add({
    type: 'income',
    amount: 8_000_000,
    accountId: bank.id,
    categoryId: salary.id,
    date: '2026-11-01',
    note: null,
  })
  await add({
    type: 'transfer',
    amount: 200_000,
    accountId: bank.id,
    toAccountId: cash.id,
    date: '2026-11-02',
    note: 'Tarik tunai',
  })
  return { client, bank, cash, bills, food }
}

const notes = (list: Transaction[]) => list.map((t) => t.note)
const amounts = (list: Transaction[]) => list.map((t) => t.amount)

describe('searching transactions', () => {
  it('finds notes across months, case-insensitive, newest first', async () => {
    const { client } = await setup()
    const { body } = await client.get<Transaction[]>('/transactions?q=listrik')
    expect(notes(body)).toEqual(['LISTRIK november', 'Listrik September'])
  })

  it('also matches the category name', async () => {
    const { client } = await setup()
    const { body } = await client.get<Transaction[]>('/transactions?q=gaji')
    expect(amounts(body)).toEqual([8_000_000])
  })

  it('treats % and _ literally', async () => {
    const { client } = await setup()
    expect(notes((await client.get<Transaction[]>('/transactions?q=50%25')).body)).toEqual([
      'Diskon 50% bakso',
    ])
    expect((await client.get<Transaction[]>('/transactions?q=%25%25')).body).toEqual([])
    expect((await client.get<Transaction[]>('/transactions?q=_')).body).toEqual([])
  })

  it(`returns at most ${SEARCH_LIMIT} results`, async () => {
    const { client, cash, food } = await setup()
    await db.insert(transactions).values(
      Array.from({ length: SEARCH_LIMIT + 5 }, (_, i) => ({
        userId: client.user.id,
        type: 'expense' as const,
        amount: i + 1,
        accountId: cash.id,
        categoryId: food.id,
        date: '2026-10-10',
        note: 'kopi',
      })),
    )
    expect((await client.get<Transaction[]>('/transactions?q=kopi')).body).toHaveLength(
      SEARCH_LIMIT,
    )
  })

  it("never returns another user's entries", async () => {
    await setup()
    const other = await setup('second@example.com')
    const { body } = await other.client.get<Transaction[]>('/transactions?q=listrik')
    expect(body).toHaveLength(2) // only their own two
    expect(
      (await other.client.get<Transaction[]>('/transactions?q=listrik&month=2026-11')).body,
    ).toHaveLength(1)
  })
})

describe('filtering transactions', () => {
  it('filters a month by type, category and wallet', async () => {
    const { client, cash, bills } = await setup()
    const get = async (query: string) =>
      (await client.get<Transaction[]>(`/transactions?month=2026-11&${query}`)).body

    expect(amounts(await get('type=income'))).toEqual([8_000_000])
    expect(amounts(await get(`categoryId=${bills.id}`))).toEqual([470_000])
    // the cash wallet: its own expense plus the transfer that landed in it
    expect(amounts(await get(`accountId=${cash.id}`))).toEqual([35_000, 200_000])
    expect(amounts(await get(`accountId=${cash.id}&type=transfer`))).toEqual([200_000])
  })

  it('combines a search with filters', async () => {
    const { client, bank } = await setup()
    const { body } = await client.get<Transaction[]>(
      `/transactions?q=listrik&accountId=${bank.id}&type=expense`,
    )
    expect(body).toHaveLength(2)
  })

  it('rejects malformed filters', async () => {
    const { client } = await setup()
    expect((await client.get('/transactions?month=2026-11&type=gift')).status).toBe(400)
    expect((await client.get('/transactions?month=2026-11&categoryId=abc')).status).toBe(400)
    expect((await client.get(`/transactions?q=${'x'.repeat(101)}`)).status).toBe(400)
  })
})
