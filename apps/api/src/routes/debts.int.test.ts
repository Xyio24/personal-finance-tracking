import type { Account, Debt, MonthlyTotal, Transaction } from '@finance/shared'
import { beforeEach, describe, expect, it } from 'vitest'
import { ensureUserDefaults } from '../services/defaults'
import { resetDatabase, signIn, type TestClient } from '../test/helpers'

beforeEach(resetDatabase)

async function setup(email?: string) {
  const client = await signIn(email)
  await ensureUserDefaults(client.user.id)
  const { body: bank } = await client.post<Account>('/accounts', {
    name: 'BCA',
    type: 'bank',
    initialBalance: 5_000_000,
  })
  return { client, bank }
}

const lend = (client: TestClient, accountId: string | null, amount = 1_500_000) =>
  client.post<Debt>('/debts', {
    direction: 'receivable',
    person: 'Budi',
    amount,
    date: '2026-11-01',
    dueDate: '2026-12-01',
    note: 'Modal usaha',
    accountId,
  })

const pay = (
  client: TestClient,
  type: 'debt_repay' | 'debt_collect',
  debtId: string,
  accountId: string,
  amount: number,
) =>
  client.post<Transaction>('/transactions', { type, amount, accountId, debtId, date: '2026-11-10' })

const walletOf = async (client: TestClient, id: string) =>
  (await client.get<Account[]>('/accounts')).body.find((a) => a.id === id)?.balance
const debtOf = async (client: TestClient, id: string) =>
  (await client.get<Debt[]>('/debts')).body.find((d) => d.id === id)

describe('debts', () => {
  it('lends money from a wallet and tracks what is still owed', async () => {
    const { client, bank } = await setup()
    const { status, body: debt } = await lend(client, bank.id)
    expect(status).toBe(201)
    expect(debt).toMatchObject({
      direction: 'receivable',
      person: 'Budi',
      amount: 1_500_000,
      paid: 0,
      remaining: 1_500_000,
      accountId: bank.id,
      writtenOff: false,
    })
    expect(await walletOf(client, bank.id)).toBe(3_500_000)
  })

  it('records a debt without moving money (e.g. paylater)', async () => {
    const { client, bank } = await setup()
    const { body: debt } = await client.post<Debt>('/debts', {
      direction: 'payable',
      person: 'Paylater',
      amount: 900_000,
      date: '2026-11-01',
      dueDate: null,
      note: null,
      accountId: null,
    })
    expect(debt).toMatchObject({ accountId: null, remaining: 900_000 })
    expect(await walletOf(client, bank.id)).toBe(5_000_000)
    expect((await client.get(`/transactions?debtId=${debt.id}`)).body).toEqual([])
  })

  it('takes payments in the matching direction, never more than what is left', async () => {
    const { client, bank } = await setup()
    const { body: debt } = await lend(client, bank.id)

    expect((await pay(client, 'debt_collect', debt.id, bank.id, 500_000)).status).toBe(201)
    expect(await debtOf(client, debt.id)).toMatchObject({ paid: 500_000, remaining: 1_000_000 })
    expect(await walletOf(client, bank.id)).toBe(4_000_000)

    expect((await pay(client, 'debt_collect', debt.id, bank.id, 1_000_001)).body).toEqual({
      error: 'debt_overpaid',
    })
    expect((await pay(client, 'debt_repay', debt.id, bank.id, 1)).body).toEqual({
      error: 'invalid_debt',
    })

    await pay(client, 'debt_collect', debt.id, bank.id, 1_000_000)
    expect(await debtOf(client, debt.id)).toMatchObject({ remaining: 0 })
    expect(await walletOf(client, bank.id)).toBe(5_000_000)
  })

  it('repays a hutang out of a wallet', async () => {
    const { client, bank } = await setup()
    const { body: debt } = await client.post<Debt>('/debts', {
      direction: 'payable',
      person: 'Kakak',
      amount: 2_000_000,
      date: '2026-11-01',
      dueDate: null,
      note: null,
      accountId: bank.id,
    })
    expect(await walletOf(client, bank.id)).toBe(7_000_000)
    await pay(client, 'debt_repay', debt.id, bank.id, 750_000)
    expect(await walletOf(client, bank.id)).toBe(6_250_000)
    expect(await debtOf(client, debt.id)).toMatchObject({ remaining: 1_250_000 })
  })

  it('writes off what is left ("ikhlaskan") and can undo it', async () => {
    const { client, bank } = await setup()
    const { body: debt } = await lend(client, bank.id)
    await pay(client, 'debt_collect', debt.id, bank.id, 500_000)

    const off = await client.patch<Debt>(`/debts/${debt.id}`, { writtenOff: true })
    expect(off.body).toMatchObject({ writtenOff: true, remaining: 0, paid: 500_000 })
    expect((await pay(client, 'debt_collect', debt.id, bank.id, 1)).body).toEqual({
      error: 'debt_closed',
    })

    const back = await client.patch<Debt>(`/debts/${debt.id}`, { writtenOff: false })
    expect(back.body).toMatchObject({ writtenOff: false, remaining: 1_000_000 })
  })

  it('keeps the opening move in step with the amount, never below what was paid', async () => {
    const { client, bank } = await setup()
    const { body: debt } = await lend(client, bank.id)
    await pay(client, 'debt_collect', debt.id, bank.id, 600_000)

    expect((await client.patch(`/debts/${debt.id}`, { amount: 500_000 })).body).toEqual({
      error: 'debt_below_paid',
    })
    const raised = await client.patch<Debt>(`/debts/${debt.id}`, { amount: 2_000_000 })
    expect(raised.body).toMatchObject({ amount: 2_000_000, remaining: 1_400_000 })
    // 5 jt − 2 jt lent + 600 rb back
    expect(await walletOf(client, bank.id)).toBe(3_600_000)
  })

  it('only deletes debts without payments, together with their opening move', async () => {
    const { client, bank } = await setup()
    const { body: paidDebt } = await lend(client, bank.id)
    await pay(client, 'debt_collect', paidDebt.id, bank.id, 100_000)
    expect(await client.del(`/debts/${paidDebt.id}`)).toMatchObject({
      status: 409,
      body: { error: 'debt_has_payments' },
    })

    const { body: fresh } = await lend(client, bank.id, 300_000)
    expect((await client.del(`/debts/${fresh.id}`)).status).toBe(204)
    expect(await walletOf(client, bank.id)).toBe(5_000_000 - 1_500_000 + 100_000)
  })

  it('deletes a debt with its payments only when asked, and wallets follow', async () => {
    const { client, bank } = await setup()
    const { body: debt } = await lend(client, bank.id)
    await pay(client, 'debt_collect', debt.id, bank.id, 400_000)
    await pay(client, 'debt_collect', debt.id, bank.id, 100_000)
    const { body: other } = await lend(client, bank.id, 200_000)
    expect(await walletOf(client, bank.id)).toBe(5_000_000 - 1_500_000 + 500_000 - 200_000)

    expect((await client.del(`/debts/${debt.id}?withTransactions=false`)).status).toBe(409)
    expect((await client.del(`/debts/${debt.id}?withTransactions=true`)).status).toBe(204)

    expect((await client.get<Debt[]>('/debts')).body.map((d) => d.id)).toEqual([other.id])
    expect((await client.get<Transaction[]>(`/transactions?debtId=${debt.id}`)).body).toEqual([])
    // Only the other debt's 200 rb is still out of the wallet.
    expect(await walletOf(client, bank.id)).toBe(4_800_000)
  })

  it('corrects the date, wallet and direction, keeping the opening move in step', async () => {
    const { client, bank } = await setup()
    const { body: cash } = await client.post<Account>('/accounts', {
      name: 'Tunai',
      type: 'cash',
      initialBalance: 2_000_000,
    })
    const { body: debt } = await lend(client, bank.id)
    const opening = async () =>
      (await client.get<Transaction[]>(`/transactions?debtId=${debt.id}`)).body.find(
        (t) => t.type === 'debt_borrow' || t.type === 'debt_lend',
      )

    // Lent from the wrong wallet, on the wrong day
    const moved = await client.patch<Debt>(`/debts/${debt.id}`, {
      accountId: cash.id,
      date: '2026-10-20',
    })
    expect(moved.body).toMatchObject({ accountId: cash.id, date: '2026-10-20' })
    expect(await opening()).toMatchObject({
      type: 'debt_lend',
      accountId: cash.id,
      date: '2026-10-20',
    })
    expect(await walletOf(client, bank.id)).toBe(5_000_000)
    expect(await walletOf(client, cash.id)).toBe(500_000)

    // It was actually borrowed, not lent
    const flipped = await client.patch<Debt>(`/debts/${debt.id}`, { direction: 'payable' })
    expect(flipped.body.direction).toBe('payable')
    expect((await opening())?.type).toBe('debt_borrow')
    expect(await walletOf(client, cash.id)).toBe(3_500_000)

    // No money moved after all (e.g. paylater), then it did after all
    const noWallet = await client.patch<Debt>(`/debts/${debt.id}`, { accountId: null })
    expect(noWallet.body.accountId).toBeNull()
    expect(await opening()).toBeUndefined()
    expect(await walletOf(client, cash.id)).toBe(2_000_000)
    await client.patch(`/debts/${debt.id}`, { accountId: bank.id, amount: 1_000_000 })
    expect(await opening()).toMatchObject({
      type: 'debt_borrow',
      amount: 1_000_000,
      date: '2026-10-20',
    })
    expect(await walletOf(client, bank.id)).toBe(6_000_000)
  })

  it('locks the direction once paid and only accepts active wallets of the user', async () => {
    const { client, bank } = await setup()
    const { body: debt } = await lend(client, bank.id)
    await pay(client, 'debt_collect', debt.id, bank.id, 100_000)
    expect(await client.patch(`/debts/${debt.id}`, { direction: 'payable' })).toMatchObject({
      status: 400,
      body: { error: 'debt_direction_locked' },
    })
    // Same direction is not a change
    expect((await client.patch(`/debts/${debt.id}`, { direction: 'receivable' })).status).toBe(200)

    // The wallet it already uses may stay after being archived; a new one must be active.
    await client.patch(`/accounts/${bank.id}`, { archived: true })
    expect(
      (await client.patch(`/debts/${debt.id}`, { accountId: bank.id, note: 'x' })).status,
    ).toBe(200)
    const { body: noWallet } = await lend(client, null, 50_000)
    expect(await client.patch(`/debts/${noWallet.id}`, { accountId: bank.id })).toMatchObject({
      status: 400,
      body: { error: 'archived_account' },
    })
    const other = await setup('second@example.com')
    expect(await client.patch(`/debts/${noWallet.id}`, { accountId: other.bank.id })).toMatchObject(
      {
        status: 400,
        body: { error: 'invalid_account' },
      },
    )
  })

  it('only lets the debt change its opening move', async () => {
    const { client, bank } = await setup()
    const { body: debt } = await lend(client, bank.id)
    const [opening] = (await client.get<Transaction[]>(`/transactions?debtId=${debt.id}`)).body
    if (!opening) throw new Error('no opening move')
    expect(opening.type).toBe('debt_lend')

    expect((await client.del(`/transactions/${opening.id}`)).body).toEqual({
      error: 'managed_by_debt',
    })
    const hijack = await client.put(`/transactions/${opening.id}`, {
      type: 'debt_collect',
      amount: 1,
      accountId: bank.id,
      debtId: debt.id,
      date: '2026-11-01',
    })
    expect(hijack.body).toEqual({ error: 'managed_by_debt' })
  })

  it('finds entries by person and leaves income/expense reports alone', async () => {
    const { client, bank } = await setup()
    const { body: debt } = await lend(client, bank.id)
    await pay(client, 'debt_collect', debt.id, bank.id, 500_000)

    expect((await client.get<Transaction[]>('/transactions?q=budi')).body).toHaveLength(2)
    const { body } = await client.get<MonthlyTotal[]>('/reports/monthly?from=2026-11&to=2026-11')
    expect(body).toEqual([{ month: '2026-11', income: 0, expense: 0 }])
  })

  it("keeps each user's debts private", async () => {
    const owner = await setup()
    const { body: debt } = await lend(owner.client, owner.bank.id)
    const other = await setup('second@example.com')

    expect((await other.client.get<Debt[]>('/debts')).body).toEqual([])
    expect((await other.client.patch(`/debts/${debt.id}`, { person: 'x' })).status).toBe(404)
    expect((await other.client.del(`/debts/${debt.id}`)).status).toBe(404)
    expect((await other.client.del(`/debts/${debt.id}?withTransactions=true`)).status).toBe(404)
    expect((await owner.client.get<Debt[]>('/debts')).body).toHaveLength(1)
    expect((await pay(other.client, 'debt_collect', debt.id, other.bank.id, 1)).body).toEqual({
      error: 'invalid_debt',
    })
    expect((await lend(other.client, owner.bank.id)).body).toEqual({ error: 'invalid_account' })
  })
})
