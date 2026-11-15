import { describe, expect, it } from 'vitest'
import { formatDate, formatDayHeading, formatMonth } from './format'

describe('date labels', () => {
  const today = '2026-11-15'

  it('names today and yesterday', () => {
    expect(formatDayHeading('2026-11-15', today)).toBe('Hari ini')
    expect(formatDayHeading('2026-11-14', today)).toBe('Kemarin')
  })

  it('spells out older days in Indonesian', () => {
    expect(formatDayHeading('2026-11-12', today)).toBe('Kamis, 12 November')
  })

  it('formats dates and months', () => {
    expect(formatDate('2026-11-15')).toBe('15 Nov 2026')
    expect(formatMonth('2026-01')).toBe('Januari 2026')
  })
})
