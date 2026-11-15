import { describe, expect, it } from 'vitest'
import { formatAmountInput, formatRupiah, MAX_AMOUNT, parseAmountInput } from './money'

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

describe('amount input helpers', () => {
  it('groups digits and leaves zero empty', () => {
    expect(formatAmountInput(1250000)).toBe('1.250.000')
    expect(formatAmountInput(0)).toBe('')
  })

  it('keeps only digits from whatever was typed', () => {
    expect(parseAmountInput('1.250.000')).toBe(1250000)
    expect(parseAmountInput('Rp 50rb')).toBe(50)
    expect(parseAmountInput('')).toBe(0)
  })

  it('caps at the maximum amount', () => {
    expect(parseAmountInput('99999999999999999')).toBe(MAX_AMOUNT)
  })
})
