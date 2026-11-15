import type { Account } from '@finance/shared'
import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../db/client'
import { categories, transactions } from '../db/schema'
import { resetDatabase, signIn, type TestClient } from '../test/helpers'

beforeEach(resetDatabase)

const bca = { name: 'BCA', type: 'bank', initialBalance: 1_000_000 } as const

async function addExpense(client: TestClient, accountId: string, amount: number) {
  const [category] = await db
    .insert(categories)
    .values({
      userId: client.user.id,
      name: 'Makan',
      type: 'expense',
      icon: 'utensils',
      color: 'orange',
    })
    .returning()
  await db.insert(transactions).values({
    userId: client.user.id,
    type: 'expense',
    amount,
    accountId,
    categoryId: category?.id,
    date: '2026-11-15',
  })
}

describe('accounts API', () => {
  it('creates an account and lists it with its balance', async () => {
    const owner = await signIn()
    const created = await owner.post<Account>('/accounts', bca)
    expect(created.status).toBe(201)
    expect(created.body).toMatchObject({ ...bca, balance: 1_000_000, archived: false })

    const list = await owner.get<Account[]>('/accounts')
    expect(list.body).toHaveLength(1)
    expect(list.body[0]?.id).toBe(created.body.id)
  })

  it('derives the balance from transactions', async () => {
    const owner = await signIn()
    const { body: account } = await owner.post<Account>('/accounts', bca)
    await addExpense(owner, account.id, 250_000)

    const { body } = await owner.get<Account[]>('/accounts')
    expect(body[0]?.balance).toBe(750_000)
  })

  it('updates fields and archives without touching the rest', async () => {
    const owner = await signIn()
    const { body: account } = await owner.post<Account>('/accounts', bca)

    const renamed = await owner.patch<Account>(`/accounts/${account.id}`, { name: 'BCA Utama' })
    expect(renamed.body).toMatchObject({ name: 'BCA Utama', initialBalance: 1_000_000 })

    const archived = await owner.patch<Account>(`/accounts/${account.id}`, { archived: true })
    expect(archived.body).toMatchObject({ name: 'BCA Utama', archived: true })

    const restored = await owner.patch<Account>(`/accounts/${account.id}`, { archived: false })
    expect(restored.body.archived).toBe(false)
  })

  it('rejects invalid input', async () => {
    const owner = await signIn()
    for (const body of [
      { ...bca, name: '   ' },
      { ...bca, type: 'crypto' },
      { ...bca, initialBalance: 10.5 },
      { name: 'Tanpa tipe' },
    ]) {
      const res = await owner.post('/accounts', body)
      expect(res.status).toBe(400)
      expect(res.body).toMatchObject({ error: 'invalid_input' })
    }
  })

  it('deletes unused accounts but refuses used ones', async () => {
    const owner = await signIn()
    const { body: unused } = await owner.post<Account>('/accounts', bca)
    const { body: used } = await owner.post<Account>('/accounts', { ...bca, name: 'Tunai' })
    await addExpense(owner, used.id, 10_000)

    expect((await owner.del(`/accounts/${unused.id}`)).status).toBe(204)
    const refused = await owner.del(`/accounts/${used.id}`)
    expect(refused).toEqual({ status: 409, body: { error: 'in_use' } })
    expect((await owner.get<Account[]>('/accounts')).body.map((a) => a.id)).toEqual([used.id])
  })

  it("keeps each user's accounts private", async () => {
    const owner = await signIn('owner@example.com')
    const other = await signIn('second@example.com')
    const { body: account } = await owner.post<Account>('/accounts', bca)

    expect((await other.get<Account[]>('/accounts')).body).toEqual([])
    expect((await other.patch(`/accounts/${account.id}`, { name: 'Hacked' })).status).toBe(404)
    expect((await other.del(`/accounts/${account.id}`)).status).toBe(404)
    expect((await owner.get<Account[]>('/accounts')).body[0]?.name).toBe('BCA')
  })

  it('answers a malformed id with 400 instead of a server error', async () => {
    const owner = await signIn()
    expect((await owner.patch('/accounts/not-a-uuid', { name: 'x' })).status).toBe(400)
  })
})
