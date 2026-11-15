import { describe, expect, it } from 'vitest'
import { computeBalances, summarize } from './balances'
import { debtInputSchema, debtStatus, debtTotals } from './debts'
import { transactionInputSchema } from './transactions'

const today = '2026-11-15'
const open = { remaining: 500_000, writtenOff: false, dueDate: null }

describe('debtStatus', () => {
  it('flags overdue and soon-due debts', () => {
    expect(debtStatus({ ...open, dueDate: '2026-11-14' }, today)).toBe('overdue')
    expect(debtStatus({ ...open, dueDate: '2026-11-15' }, today)).toBe('due_soon')
    expect(debtStatus({ ...open, dueDate: '2026-11-22' }, today)).toBe('due_soon')
    expect(debtStatus({ ...open, dueDate: '2026-11-23' }, today)).toBe('open')
    expect(debtStatus(open, today)).toBe('open')
  })

  it('knows settled and written-off debts, whatever the due date', () => {
    expect(debtStatus({ ...open, remaining: 0, dueDate: '2026-01-01' }, today)).toBe('settled')
    expect(debtStatus({ ...open, writtenOff: true, remaining: 0 }, today)).toBe('written_off')
  })
})

describe('debtTotals', () => {
  it('adds up what is owed each way', () => {
    expect(
      debtTotals([
        { direction: 'receivable', remaining: 1_000_000 },
        { direction: 'receivable', remaining: 300_000 },
        { direction: 'payable', remaining: 2_000_000 },
      ]),
    ).toEqual({ receivable: 1_300_000, payable: 2_000_000, net: -700_000 })
  })
})

describe('debt money flows', () => {
  const wallet = [{ id: 'bank', initialBalance: 1_000_000 }]
  const move = (type: string, amount: number) =>
    ({ type, amount, accountId: 'bank', toAccountId: null }) as const

  it('moves wallet money the right way for each debt type', () => {
    const balance = (type: string) =>
      computeBalances(wallet, [move(type, 100_000) as never]).get('bank')
    expect(balance('debt_borrow')).toBe(1_100_000) // borrowed money arrives
    expect(balance('debt_lend')).toBe(900_000) // lent money leaves
    expect(balance('debt_repay')).toBe(900_000) // paying back a hutang
    expect(balance('debt_collect')).toBe(1_100_000) // a piutang is paid back
  })

  it('counts as neither income nor expense', () => {
    const types = ['debt_borrow', 'debt_lend', 'debt_repay', 'debt_collect'] as const
    expect(summarize(types.map((type) => ({ type, amount: 1 })))).toEqual({
      income: 0,
      expense: 0,
      net: 0,
    })
  })
})

describe('schemas', () => {
  const debt = {
    direction: 'receivable',
    person: '  Budi ',
    amount: 1_500_000,
    date: today,
    dueDate: '2026-12-15',
    note: null,
    accountId: '0b6c5e4e-1c1a-4d4f-9a55-3f0e2d1b7a10',
  }

  it('accepts a debt with or without a wallet', () => {
    expect(debtInputSchema.parse(debt).person).toBe('Budi')
    expect(debtInputSchema.safeParse({ ...debt, accountId: null }).success).toBe(true)
    expect(debtInputSchema.safeParse({ ...debt, direction: 'gift' }).success).toBe(false)
    expect(debtInputSchema.safeParse({ ...debt, person: ' ' }).success).toBe(false)
  })

  it('only accepts payments as debt transactions; openings belong to /api/debts', () => {
    const payment = {
      type: 'debt_collect',
      amount: 500_000,
      accountId: debt.accountId,
      debtId: '7f1e2a3b-4c5d-4e6f-8a9b-0c1d2e3f4a5b',
      date: today,
    }
    expect(transactionInputSchema.safeParse(payment).success).toBe(true)
    expect(transactionInputSchema.safeParse({ ...payment, type: 'debt_lend' }).success).toBe(false)
  })
})
