import { describe, expect, it } from 'vitest'
import { fromDateKey, monthRange, shiftDate, shiftMonth, toDateKey, toMonthKey } from './dates'

describe('date keys', () => {
  it('uses the local calendar date', () => {
    expect(toDateKey(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05')
    expect(toMonthKey(new Date(2026, 10, 15))).toBe('2026-11')
    expect(toMonthKey('2026-11-15')).toBe('2026-11')
  })

  it('round-trips through fromDateKey', () => {
    expect(toDateKey(fromDateKey('2024-02-29'))).toBe('2024-02-29')
  })

  it('shifts days across month and year ends', () => {
    expect(shiftDate('2026-12-31', 1)).toBe('2027-01-01')
    expect(shiftDate('2026-03-01', -1)).toBe('2026-02-28')
  })
})

describe('months', () => {
  it('shifts across year boundaries', () => {
    expect(shiftMonth('2026-12', 1)).toBe('2027-01')
    expect(shiftMonth('2026-01', -1)).toBe('2025-12')
    expect(shiftMonth('2026-05', -17)).toBe('2024-12')
  })

  it('gives a half-open range', () => {
    expect(monthRange('2026-12')).toEqual({ start: '2026-12-01', end: '2027-01-01' })
  })
})
