import { describe, expect, it } from 'vitest'
import { daysInMonth, monthsBetween } from './dates'
import { formatCompact, monthlyReportQuerySchema, totalsByCategory } from './reports'

describe('totalsByCategory', () => {
  it('sums one side per category, largest first, ignoring transfers', () => {
    const totals = totalsByCategory(
      [
        { type: 'expense', amount: 30, categoryId: 'food' },
        { type: 'expense', amount: 50, categoryId: 'bills' },
        { type: 'expense', amount: 40, categoryId: 'food' },
        { type: 'income', amount: 999, categoryId: 'salary' },
        { type: 'transfer', amount: 999, categoryId: null },
      ],
      'expense',
    )
    expect(totals).toEqual([
      { categoryId: 'food', total: 70, count: 2 },
      { categoryId: 'bills', total: 50, count: 1 },
    ])
  })
})

describe('month helpers', () => {
  it('lists every month in a range across a year end', () => {
    expect(monthsBetween('2025-11', '2026-02')).toEqual([
      '2025-11',
      '2025-12',
      '2026-01',
      '2026-02',
    ])
    expect(monthsBetween('2026-03', '2026-03')).toEqual(['2026-03'])
  })

  it('knows month lengths, leap years included', () => {
    expect(daysInMonth('2024-02')).toBe(29)
    expect(daysInMonth('2026-02')).toBe(28)
    expect(daysInMonth('2026-11')).toBe(30)
  })
})

describe('formatCompact', () => {
  it('uses Indonesian short units', () => {
    expect(formatCompact(1_250_000)).toBe('1,3 jt')
    expect(formatCompact(450_000)).toBe('450 rb')
    expect(formatCompact(0)).toBe('0')
  })
})

describe('report range', () => {
  it('limits report ranges to 24 months, in order', () => {
    const ok = (from: string, to: string) =>
      monthlyReportQuerySchema.safeParse({ from, to }).success
    expect(ok('2025-06', '2026-05')).toBe(true)
    expect(ok('2024-12', '2026-11')).toBe(true)
    expect(ok('2024-11', '2026-11')).toBe(false)
    expect(ok('2026-11', '2026-10')).toBe(false)
  })
})
