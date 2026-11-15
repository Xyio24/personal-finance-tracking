import { type Account, type Category, DEFAULT_CATEGORIES } from '@finance/shared'
import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../db/client'
import { transactions } from '../db/schema'
import { ensureUserDefaults } from '../services/defaults'
import { resetDatabase, signIn } from '../test/helpers'

beforeEach(resetDatabase)

const coffee = { name: 'Kopi', type: 'expense', icon: 'coffee', color: 'amber' } as const

describe('default data for new users', () => {
  it('creates starter categories and a cash account once', async () => {
    const owner = await signIn()
    await ensureUserDefaults(owner.user.id)
    await ensureUserDefaults(owner.user.id) // second login must not duplicate anything

    const { body: list } = await owner.get<Category[]>('/categories')
    expect(list).toHaveLength(DEFAULT_CATEGORIES.length)
    const expenseNames = list.filter((c) => c.type === 'expense').map((c) => c.name)
    expect(expenseNames[0]).toBe('Makan & Minum')
    expect(expenseNames.at(-1)).toBe('Lainnya')

    const { body: accounts } = await owner.get<Account[]>('/accounts')
    expect(accounts).toMatchObject([{ name: 'Tunai', type: 'cash', balance: 0 }])
  })

  it('does not bring defaults back after the user edits them', async () => {
    const owner = await signIn()
    await ensureUserDefaults(owner.user.id)
    const { body: list } = await owner.get<Category[]>('/categories')
    for (const category of list.slice(1)) await owner.del(`/categories/${category.id}`)

    await ensureUserDefaults(owner.user.id)
    expect((await owner.get<Category[]>('/categories')).body).toHaveLength(1)
  })
})

describe('categories API', () => {
  it('creates a category before "Lainnya" and updates it', async () => {
    const owner = await signIn()
    await ensureUserDefaults(owner.user.id)

    const created = await owner.post<Category>('/categories', coffee)
    expect(created.status).toBe(201)
    const expense = (await owner.get<Category[]>('/categories')).body.filter(
      (c) => c.type === 'expense',
    )
    expect(expense.at(-2)?.name).toBe('Kopi')
    expect(expense.at(-1)?.name).toBe('Lainnya')

    const updated = await owner.patch<Category>(`/categories/${created.body.id}`, {
      name: 'Ngopi',
      color: 'orange',
    })
    expect(updated.body).toMatchObject({ name: 'Ngopi', icon: 'coffee', color: 'orange' })
  })

  it('does not allow changing the type or using unknown icons', async () => {
    const owner = await signIn()
    const { body: category } = await owner.post<Category>('/categories', coffee)

    await owner.patch(`/categories/${category.id}`, { type: 'income' })
    expect((await owner.get<Category[]>('/categories')).body[0]?.type).toBe('expense')
    expect((await owner.post('/categories', { ...coffee, icon: 'skull' })).status).toBe(400)
  })

  it('archives used categories instead of deleting them', async () => {
    const owner = await signIn()
    await ensureUserDefaults(owner.user.id)
    const { body: category } = await owner.post<Category>('/categories', coffee)
    const [account] = (await owner.get<Account[]>('/accounts')).body
    await db.insert(transactions).values({
      userId: owner.user.id,
      type: 'expense',
      amount: 18_000,
      accountId: account?.id ?? '',
      categoryId: category.id,
      date: '2026-11-15',
    })

    expect((await owner.del(`/categories/${category.id}`)).status).toBe(409)
    const archived = await owner.patch<Category>(`/categories/${category.id}`, { archived: true })
    expect(archived.body.archived).toBe(true)
  })

  it("keeps each user's categories private", async () => {
    const owner = await signIn('owner@example.com')
    const other = await signIn('second@example.com')
    const { body: category } = await owner.post<Category>('/categories', coffee)

    expect((await other.get<Category[]>('/categories')).body).toEqual([])
    expect((await other.patch(`/categories/${category.id}`, { name: 'x' })).status).toBe(404)
    expect((await other.del(`/categories/${category.id}`)).status).toBe(404)
  })
})
