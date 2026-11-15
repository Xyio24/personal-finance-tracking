import { describe, expect, it } from 'vitest'
import { formatRupiah } from './money'

const nbsp = ' '

describe('formatRupiah', () => {
  it('formats with dot thousand separators and no decimals', () => {
    expect(formatRupiah(1250000)).toBe(`Rp${nbsp}1.250.000`)
  })

  it('rounds fractional amounts', () => {
    expect(formatRupiah(999.6)).toBe(`Rp${nbsp}1.000`)
  })

  it('formats zero and negatives', () => {
    expect(formatRupiah(0)).toBe(`Rp${nbsp}0`)
    expect(formatRupiah(-50000)).toBe(`-Rp${nbsp}50.000`)
  })
})
