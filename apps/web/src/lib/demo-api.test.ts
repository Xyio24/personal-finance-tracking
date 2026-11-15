import {
  type Account,
  type Category,
  type Debt,
  debtStatus,
  goalProgress,
  type MonthlyTotal,
  monthsBetween,
  type SavingsGoal,
  shiftMonth,
  type Transaction,
  toDateKey,
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

describe('demo API savings', () => {
  const goals = () => demoRequest<SavingsGoal[]>('/savings')

  it('starts with goals in every state', async () => {
    const today = toDateKey(new Date())
    const status = Object.fromEntries(
      (await goals()).map((g) => [g.name, goalProgress(g, today).status]),
    )
    expect(status).toEqual({
      'Dana Darurat': 'open',
      'Liburan Bali': 'on_track',
      'Laptop baru': 'behind',
      'HP baru': 'achieved',
    })
  })

  it('moves money like the server and refuses an oversized "culik"', async () => {
    const { cash } = await lookups()
    const trip = (await goals()).find((g) => g.name === 'Liburan Bali')
    if (!trip) throw new Error('missing goal')
    const move = (type: string, amount: number) =>
      post('/transactions', {
        type,
        amount,
        accountId: cash.id,
        goalId: trip.id,
        date: '2026-11-15',
      })

    await move('saving_deposit', 100_000)
    const after = (await goals()).find((g) => g.id === trip.id)
    expect(after?.balance).toBe(trip.balance + 100_000)
    const wallet = (await demoRequest<Account[]>('/accounts')).find((a) => a.id === cash.id)
    expect(wallet?.balance).toBe(cash.balance - 100_000)

    await expect(move('saving_withdrawal', trip.balance + 100_001)).rejects.toSatisfy(
      (e) => e instanceof ApiError && e.message === 'insufficient_savings',
    )
  })
})

describe('demo API debts', () => {
  const debts = () => demoRequest<Debt[]>('/debts')

  it('starts with debts in every state', async () => {
    const today = toDateKey(new Date())
    const status = Object.fromEntries((await debts()).map((d) => [d.person, debtStatus(d, today)]))
    expect(status).toEqual({
      Budi: 'open',
      Kakak: 'due_soon',
      Rina: 'overdue',
      Paylater: 'open',
      Andi: 'settled',
    })
    expect((await debts()).find((d) => d.person === 'Paylater')?.accountId).toBeNull()
  })

  it('takes payments like the server', async () => {
    const { cash } = await lookups()
    const budi = (await debts()).find((d) => d.person === 'Budi')
    if (!budi) throw new Error('missing debt')
    const collect = (amount: number) =>
      post('/transactions', {
        type: 'debt_collect',
        amount,
        accountId: cash.id,
        debtId: budi.id,
        date: '2026-11-15',
      })

    await collect(400_000)
    expect((await debts()).find((d) => d.id === budi.id)?.remaining).toBe(budi.remaining - 400_000)
    await expect(collect(budi.remaining)).rejects.toSatisfy(
      (e) => e instanceof ApiError && e.message === 'debt_overpaid',
    )
  })

  it('only changes an opening move through its debt', async () => {
    const budi = (await debts()).find((d) => d.person === 'Budi')
    const history = await demoRequest<Transaction[]>(`/transactions?debtId=${budi?.id}`)
    const opening = history.find((t) => t.type === 'debt_lend')
    await expect(
      demoRequest(`/transactions/${opening?.id}`, { method: 'DELETE' }),
    ).rejects.toSatisfy((e) => e instanceof ApiError && e.message === 'managed_by_debt')
  })
})

describe('demo export', () => {
  it('builds the same CSV as the server, one line per transaction', async () => {
    const csv = await demoRequest<string>('/export/transactions.csv')
    const lines = csv.replace(/^﻿/, '').trimEnd().split('\r\n')
    const all = await demoRequest<Transaction[]>('/transactions?q=a')
    expect(lines[0]).toBe(
      'Tanggal,Jenis,Jumlah,Dompet,Dompet tujuan,Kategori,Tabungan,Orang,Catatan',
    )
    expect(lines.length).toBeGreaterThan(all.length)
    expect(lines.some((line) => line.includes(',Terima piutang,') && line.includes(',Budi,'))).toBe(
      true,
    )
    // Newest first
    const dates = lines.slice(1).map((line) => line.slice(0, 10))
    expect([...dates].sort().reverse()).toEqual(dates)
  })
})

describe('demo API corrections and deletes', () => {
  const debts = () => demoRequest<Debt[]>('/debts')
  const balanceSum = async () =>
    (await demoRequest<Account[]>('/accounts')).reduce((sum, a) => sum + a.balance, 0)
  const refusedWith = (code: string) => (e: unknown) => e instanceof ApiError && e.message === code

  it('deletes a debt with its payments only when asked, and wallets follow', async () => {
    const budi = (await debts()).find((d) => d.person === 'Budi')
    if (!budi?.accountId || budi.paid === 0) throw new Error('seed: Budi lent from a wallet, paid')
    const before = await balanceSum()

    await expect(demoRequest(`/debts/${budi.id}`, { method: 'DELETE' })).rejects.toSatisfy(
      refusedWith('debt_has_payments'),
    )
    await demoRequest(`/debts/${budi.id}?withTransactions=true`, { method: 'DELETE' })

    expect((await debts()).some((d) => d.id === budi.id)).toBe(false)
    expect(await demoRequest(`/transactions?debtId=${budi.id}`)).toEqual([])
    // The lent money comes back to the wallet, minus what Budi had already returned.
    expect(await balanceSum()).toBe(before + budi.amount - budi.paid)
  })

  it('corrects the date, wallet and direction of a debt', async () => {
    const { cash, gopay } = await lookups()
    const debt = await post<Debt>('/debts', {
      direction: 'receivable',
      person: 'Uji',
      amount: 100_000,
      date: '2026-11-10',
      dueDate: null,
      note: null,
      accountId: cash.id,
    })
    const opening = async () =>
      (await demoRequest<Transaction[]>(`/transactions?debtId=${debt.id}`)).find(
        (t) => t.type === 'debt_borrow' || t.type === 'debt_lend',
      )

    const fixed = await demoRequest<Debt>(`/debts/${debt.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ direction: 'payable', accountId: gopay.id, date: '2026-11-01' }),
    })
    expect(fixed).toMatchObject({ direction: 'payable', accountId: gopay.id, date: '2026-11-01' })
    expect(await opening()).toMatchObject({
      type: 'debt_borrow',
      accountId: gopay.id,
      date: '2026-11-01',
    })

    await demoRequest(`/debts/${debt.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ accountId: null }),
    })
    expect(await opening()).toBeUndefined()
  })

  it('locks the direction once something is paid', async () => {
    const budi = (await debts()).find((d) => d.person === 'Budi')
    await expect(
      demoRequest(`/debts/${budi?.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ direction: 'payable' }),
      }),
    ).rejects.toSatisfy(refusedWith('debt_direction_locked'))
  })

  it('deletes a goal with its isi and culik only when asked', async () => {
    const goals = await demoRequest<SavingsGoal[]>('/savings')
    const used = goals.find((g) => g.name === 'Dana Darurat')
    await expect(demoRequest(`/savings/${used?.id}`, { method: 'DELETE' })).rejects.toSatisfy(
      refusedWith('in_use'),
    )
    await demoRequest(`/savings/${used?.id}?withTransactions=true`, { method: 'DELETE' })
    expect((await demoRequest<SavingsGoal[]>('/savings')).some((g) => g.id === used?.id)).toBe(
      false,
    )
    expect(await demoRequest(`/transactions?goalId=${used?.id}`)).toEqual([])
  })

  it('never lets lowering the starting amount push a goal below zero', async () => {
    const { cash } = await lookups()
    const goal = await post<SavingsGoal>('/savings', {
      name: 'Uji',
      icon: 'piggy-bank',
      color: 'emerald',
      targetAmount: null,
      deadline: null,
      initialAmount: 1_000_000,
    })
    await post('/transactions', {
      type: 'saving_withdrawal',
      amount: 800_000,
      accountId: cash.id,
      goalId: goal.id,
      date: '2026-11-10',
    })
    await expect(
      demoRequest(`/savings/${goal.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ initialAmount: 0 }),
      }),
    ).rejects.toSatisfy(refusedWith('savings_below_withdrawn'))
  })
})
