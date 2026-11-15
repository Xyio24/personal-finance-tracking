import { describe, expect, it } from 'vitest'
import { computeBalances, computeGoalBalances, summarize } from './balances'
import { daysBetween } from './dates'
import { goalInputSchema, goalProgress } from './savings'
import { transactionInputSchema } from './transactions'

const today = '2026-11-15'
const base = {
  targetAmount: 12_000_000,
  deadline: '2027-05-15', // about 6 months away
  balance: 6_000_000,
  savedLast90Days: 3_000_000, // 1 jt per month
  createdAt: '2026-01-01T00:00:00.000Z',
}

describe('goalProgress', () => {
  it('computes what is still needed per month, rounded up to Rp 1.000', () => {
    const progress = goalProgress(base, today)
    expect(progress.ratio).toBe(0.5)
    expect(progress.remaining).toBe(6_000_000)
    expect(progress.monthlyNeeded).toBe(1_000_000)
    expect(progress.status).toBe('on_track')
    expect(progress.pace).toBe(1_000_000)
  })

  it('calls it tight or behind when the recent pace falls short', () => {
    expect(goalProgress({ ...base, savedLast90Days: 2_100_000 }, today).status).toBe('tight')
    expect(goalProgress({ ...base, savedLast90Days: 600_000 }, today).status).toBe('behind')
  })

  it('does not judge a brand-new goal before anything is saved', () => {
    const fresh = { ...base, savedLast90Days: 0, balance: 0, createdAt: '2026-11-10T08:00:00Z' }
    expect(goalProgress(fresh, today).status).toBe('new')
  })

  it('measures a young goal by its own age, not by 90 days', () => {
    // Created two weeks ago, already saved a month's worth: on track.
    const young = { ...base, savedLast90Days: 1_000_000, createdAt: '2026-11-01T00:00:00Z' }
    expect(goalProgress(young, today).status).toBe('on_track')
  })

  it('handles reached, overdue and open-ended goals', () => {
    expect(goalProgress({ ...base, balance: 12_500_000 }, today)).toMatchObject({
      ratio: 1,
      remaining: 0,
      status: 'achieved',
    })
    expect(goalProgress({ ...base, deadline: '2026-10-01' }, today)).toMatchObject({
      status: 'overdue',
      monthlyNeeded: 6_000_000,
    })
    expect(goalProgress({ ...base, deadline: null }, today)).toMatchObject({
      status: 'open',
      monthlyNeeded: null,
      ratio: 0.5,
    })
    expect(goalProgress({ ...base, targetAmount: null }, today)).toMatchObject({
      status: 'open',
      ratio: null,
    })
  })

  it('asks for the whole remainder when the deadline is this month', () => {
    expect(goalProgress({ ...base, deadline: '2026-11-30' }, today).monthlyNeeded).toBe(6_000_000)
  })
})

describe('savings money flows', () => {
  const moves = [
    {
      type: 'saving_deposit',
      amount: 500_000,
      accountId: 'bank',
      toAccountId: null,
      goalId: 'trip',
    },
    {
      type: 'saving_withdrawal',
      amount: 200_000,
      accountId: 'cash',
      toAccountId: null,
      goalId: 'trip',
    },
  ] as const

  it('moves money between wallets and goals without changing net worth', () => {
    const wallets = computeBalances(
      [
        { id: 'bank', initialBalance: 1_000_000 },
        { id: 'cash', initialBalance: 0 },
      ],
      moves,
    )
    const goals = computeGoalBalances([{ id: 'trip', initialAmount: 100_000 }], moves)
    expect(wallets.get('bank')).toBe(500_000)
    expect(wallets.get('cash')).toBe(200_000)
    expect(goals.get('trip')).toBe(400_000)
    const total = [...wallets.values(), ...goals.values()].reduce((a, b) => a + b, 0)
    expect(total).toBe(1_100_000)
  })

  it('counts as neither income nor expense', () => {
    expect(summarize(moves)).toEqual({ income: 0, expense: 0, net: 0 })
  })
})

describe('schemas', () => {
  it('accepts savings deposits and withdrawals with a goal', () => {
    const entry = {
      type: 'saving_withdrawal',
      amount: 200_000,
      accountId: '0b6c5e4e-1c1a-4d4f-9a55-3f0e2d1b7a10',
      goalId: '7f1e2a3b-4c5d-4e6f-8a9b-0c1d2e3f4a5b',
      date: today,
      note: 'Servis motor',
    }
    expect(transactionInputSchema.safeParse(entry).success).toBe(true)
    expect(transactionInputSchema.safeParse({ ...entry, goalId: undefined }).success).toBe(false)
  })

  it('validates goals', () => {
    const goal = {
      name: 'Liburan Bali',
      icon: 'plane',
      color: 'sky',
      targetAmount: 8_000_000,
      deadline: '2027-06-01',
      initialAmount: 0,
    }
    expect(goalInputSchema.safeParse(goal).success).toBe(true)
    expect(goalInputSchema.safeParse({ ...goal, targetAmount: null, deadline: null }).success).toBe(
      true,
    )
    expect(goalInputSchema.safeParse({ ...goal, targetAmount: 0 }).success).toBe(false)
    expect(goalInputSchema.safeParse({ ...goal, initialAmount: -1 }).success).toBe(false)
  })

  it('counts days between date keys', () => {
    expect(daysBetween('2026-11-15', '2026-12-15')).toBe(30)
    expect(daysBetween('2026-11-15', '2026-11-01')).toBe(-14)
  })
})
