import {
  type Account,
  type MonthlyTotal,
  type SavingsGoal,
  shiftDate,
  type Transaction,
  toDateKey,
} from '@finance/shared'
import { beforeEach, describe, expect, it } from 'vitest'
import { ensureUserDefaults } from '../services/defaults'
import { resetDatabase, signIn, type TestClient } from '../test/helpers'

beforeEach(resetDatabase)

const trip = {
  name: 'Liburan Bali',
  icon: 'plane',
  color: 'sky',
  targetAmount: 8_000_000,
  deadline: '2027-06-01',
  initialAmount: 1_000_000,
} as const

async function setup(email?: string) {
  const client = await signIn(email)
  await ensureUserDefaults(client.user.id)
  const { body: bank } = await client.post<Account>('/accounts', {
    name: 'BCA',
    type: 'bank',
    initialBalance: 5_000_000,
  })
  const { body: goal } = await client.post<SavingsGoal>('/savings', trip)
  return { client, bank, goal }
}

const move = (
  client: TestClient,
  type: 'saving_deposit' | 'saving_withdrawal',
  accountId: string,
  goalId: string,
  amount: number,
  date = '2026-11-10',
) => client.post<Transaction>('/transactions', { type, amount, accountId, goalId, date })

const goalsOf = async (client: TestClient) => (await client.get<SavingsGoal[]>('/savings')).body
const walletOf = async (client: TestClient, id: string) =>
  (await client.get<Account[]>('/accounts')).body.find((a) => a.id === id)?.balance

describe('savings goals', () => {
  it('creates a goal that starts at its initial amount', async () => {
    const { client, goal } = await setup()
    expect(goal).toMatchObject({ ...trip, balance: 1_000_000, savedLast90Days: 0, archived: false })
    expect(await goalsOf(client)).toHaveLength(1)
  })

  it('moves money between wallet and goal ("isi" and "culik")', async () => {
    const { client, bank, goal } = await setup()
    expect((await move(client, 'saving_deposit', bank.id, goal.id, 2_000_000)).status).toBe(201)
    expect((await move(client, 'saving_withdrawal', bank.id, goal.id, 500_000)).status).toBe(201)

    expect(await walletOf(client, bank.id)).toBe(5_000_000 - 2_000_000 + 500_000)
    expect((await goalsOf(client))[0]?.balance).toBe(1_000_000 + 2_000_000 - 500_000)
  })

  it('never lets "culik" take more than the goal holds', async () => {
    const { client, bank, goal } = await setup()
    const tooMuch = await move(client, 'saving_withdrawal', bank.id, goal.id, 1_000_001)
    expect(tooMuch).toEqual({ status: 400, body: { error: 'insufficient_savings' } })

    // Editing a withdrawal checks against the goal without counting that withdrawal twice.
    const { body: entry } = await move(client, 'saving_withdrawal', bank.id, goal.id, 600_000)
    const edited = await client.put(`/transactions/${entry.id}`, {
      type: 'saving_withdrawal',
      amount: 1_000_000,
      accountId: bank.id,
      goalId: goal.id,
      date: '2026-11-10',
    })
    expect(edited.status).toBe(200)
    expect((await goalsOf(client))[0]?.balance).toBe(0)
  })

  it('never lets removing or shrinking a deposit push a goal below zero', async () => {
    const { client, bank, goal } = await setup()
    await client.patch(`/savings/${goal.id}`, { initialAmount: 0 })
    const { body: deposit } = await move(client, 'saving_deposit', bank.id, goal.id, 1_000_000)
    const { body: kidnap } = await move(client, 'saving_withdrawal', bank.id, goal.id, 800_000)

    expect(await client.del(`/transactions/${deposit.id}`)).toEqual({
      status: 400,
      body: { error: 'savings_already_used' },
    })
    const shrink = (amount: number) =>
      client.put(`/transactions/${deposit.id}`, {
        type: 'saving_deposit',
        amount,
        accountId: bank.id,
        goalId: goal.id,
        date: '2026-11-10',
      })
    expect((await shrink(700_000)).body).toEqual({ error: 'savings_already_used' })
    expect((await shrink(800_000)).status).toBe(200)

    // Undo the "culik" first, then the deposit can go.
    expect((await client.del(`/transactions/${kidnap.id}`)).status).toBe(204)
    expect((await client.del(`/transactions/${deposit.id}`)).status).toBe(204)
    expect((await goalsOf(client))[0]?.balance).toBe(0)
  })

  it('refuses archived goals and goals of other users', async () => {
    const { client, bank, goal } = await setup()
    const other = await setup('second@example.com')

    expect((await move(client, 'saving_deposit', bank.id, other.goal.id, 1)).body).toEqual({
      error: 'invalid_goal',
    })
    await client.patch(`/savings/${goal.id}`, { archived: true })
    expect((await move(client, 'saving_deposit', bank.id, goal.id, 1)).body).toEqual({
      error: 'archived_goal',
    })
  })

  it('updates, archives and deletes goals like wallets', async () => {
    const { client, bank, goal } = await setup()
    const updated = await client.patch<SavingsGoal>(`/savings/${goal.id}`, {
      targetAmount: null,
      deadline: null,
    })
    expect(updated.body).toMatchObject({ targetAmount: null, deadline: null, name: trip.name })

    const { body: spare } = await client.post<SavingsGoal>('/savings', {
      ...trip,
      name: 'Cadangan',
    })
    expect((await client.del(`/savings/${spare.id}`)).status).toBe(204)

    await move(client, 'saving_deposit', bank.id, goal.id, 100_000)
    expect((await client.del(`/savings/${goal.id}`)).status).toBe(409)
  })

  it('deletes a goal with its isi and culik only when asked, and wallets follow', async () => {
    const { client, bank, goal } = await setup()
    await move(client, 'saving_deposit', bank.id, goal.id, 2_000_000)
    await move(client, 'saving_withdrawal', bank.id, goal.id, 500_000)
    const { body: other } = await client.post<SavingsGoal>('/savings', { ...trip, name: 'Laptop' })
    await move(client, 'saving_deposit', bank.id, other.id, 300_000)
    expect(await walletOf(client, bank.id)).toBe(5_000_000 - 2_000_000 + 500_000 - 300_000)

    expect(await client.del(`/savings/${goal.id}`)).toMatchObject({
      status: 409,
      body: { error: 'in_use' },
    })
    expect((await client.del(`/savings/${goal.id}?withTransactions=true`)).status).toBe(204)

    expect((await goalsOf(client)).map((g) => g.id)).toEqual([other.id])
    expect((await client.get(`/transactions?goalId=${goal.id}`)).body).toEqual([])
    // Only the other goal's 300 rb is still out of the wallet.
    expect(await walletOf(client, bank.id)).toBe(4_700_000)
  })

  it('never lets lowering the starting amount push a goal below zero', async () => {
    const { client, bank, goal } = await setup() // starts with 1 jt
    await move(client, 'saving_withdrawal', bank.id, goal.id, 800_000)

    expect(await client.patch(`/savings/${goal.id}`, { initialAmount: 0 })).toMatchObject({
      status: 400,
      body: { error: 'savings_below_withdrawn' },
    })
    const lowered = await client.patch<SavingsGoal>(`/savings/${goal.id}`, {
      initialAmount: 800_000,
    })
    expect(lowered.body).toMatchObject({ initialAmount: 800_000, balance: 0 })
    // Saving the form again with the same amount, or renaming, is always fine.
    const renamed = await client.patch<SavingsGoal>(`/savings/${goal.id}`, {
      name: 'Bali',
      initialAmount: 800_000,
    })
    expect(renamed.body).toMatchObject({ name: 'Bali', balance: 0 })
  })

  it('reports a recent saving pace and leaves income/expense reports alone', async () => {
    const { client, bank, goal } = await setup()
    const today = toDateKey(new Date())
    await move(client, 'saving_deposit', bank.id, goal.id, 300_000, today)
    await move(client, 'saving_deposit', bank.id, goal.id, 900_000, shiftDate(today, -200))

    expect((await goalsOf(client))[0]?.savedLast90Days).toBe(300_000)
    const month = today.slice(0, 7)
    const { body } = await client.get<MonthlyTotal[]>(`/reports/monthly?from=${month}&to=${month}`)
    expect(body).toEqual([{ month, income: 0, expense: 0 }])
  })

  it('lists a goal history and finds entries by goal name', async () => {
    const { client, bank, goal } = await setup()
    await move(client, 'saving_deposit', bank.id, goal.id, 100_000, '2026-01-05')
    await move(client, 'saving_withdrawal', bank.id, goal.id, 50_000, '2026-11-05')

    const history = await client.get<Transaction[]>(`/transactions?goalId=${goal.id}`)
    expect(history.body.map((t) => t.type)).toEqual(['saving_withdrawal', 'saving_deposit'])
    expect(history.body.every((t) => t.goalId === goal.id)).toBe(true)
    expect((await client.get<Transaction[]>('/transactions?q=bali')).body).toHaveLength(2)
  })

  it("keeps each user's goals private", async () => {
    const owner = await setup()
    const { goal } = owner
    const other = await setup('second@example.com')
    expect((await goalsOf(other.client)).map((g) => g.id)).toEqual([other.goal.id])
    expect((await other.client.patch(`/savings/${goal.id}`, { name: 'x' })).status).toBe(404)
    expect((await other.client.del(`/savings/${goal.id}`)).status).toBe(404)
    expect((await other.client.del(`/savings/${goal.id}?withTransactions=true`)).status).toBe(404)
    expect(await goalsOf(owner.client)).toHaveLength(1)
    expect((await other.client.get(`/transactions?goalId=${goal.id}`)).body).toEqual([])
  })
})
