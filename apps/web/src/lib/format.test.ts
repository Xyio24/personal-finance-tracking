import { describe, expect, it } from 'vitest'
import {
  formatDate,
  formatDayHeading,
  formatMonth,
  formatShare,
  formatShortMonth,
  formatSignedRupiah,
} from './format'

describe('date labels', () => {
  const today = '2026-11-15'

  it('names today and yesterday', () => {
    expect(formatDayHeading('2026-11-15', today)).toBe('Hari ini')
    expect(formatDayHeading('2026-11-14', today)).toBe('Kemarin')
  })

  it('spells out older days in Indonesian', () => {
    expect(formatDayHeading('2026-11-12', today)).toBe('Kamis, 12 November')
    expect(formatDayHeading('2025-12-24', today)).toBe('Rabu, 24 Desember 2025')
  })

  it('formats dates and months', () => {
    expect(formatDate('2026-11-15')).toBe('15 Nov 2026')
    expect(formatMonth('2026-01')).toBe('Januari 2026')
  })
})

describe('chart labels', () => {
  it('formats shares without hiding tiny ones', () => {
    expect(formatShare(0.456)).toBe('46%')
    expect(formatShare(0.001)).toBe('<1%')
    expect(formatShare(0)).toBe('0%')
  })

  it('signs amounts and shortens months', () => {
    expect(formatSignedRupiah(1500)).toBe('+Rp\u00a01.500')
    expect(formatSignedRupiah(-38000)).toBe('−Rp\u00a038.000')
    expect(formatSignedRupiah(0)).toBe('Rp\u00a00')
    expect(formatShortMonth('2026-10')).toBe('Okt')
  })
})
