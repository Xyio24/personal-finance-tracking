import { describe, expect, it } from 'vitest'
import { type ExportRow, transactionsToCsv } from './export'

const row = (overrides: Partial<ExportRow> = {}): ExportRow => ({
  date: '2026-11-15',
  type: 'expense',
  amount: 38_000,
  account: 'Tunai',
  toAccount: null,
  category: 'Makan & Minum',
  goal: null,
  person: null,
  note: null,
  ...overrides,
})

const lines = (csv: string) => csv.replace(/^﻿/, '').trimEnd().split('\r\n')

describe('transactionsToCsv', () => {
  it('starts with a BOM and a header, one CRLF line per transaction', () => {
    const csv = transactionsToCsv([row(), row({ type: 'income', amount: 8_500_000 })])
    expect(csv.startsWith('﻿')).toBe(true)
    expect(csv.endsWith('\r\n')).toBe(true)
    expect(lines(csv)).toEqual([
      'Tanggal,Jenis,Jumlah,Dompet,Dompet tujuan,Kategori,Tabungan,Orang,Catatan',
      '2026-11-15,Pengeluaran,38000,Tunai,,Makan & Minum,,,',
      '2026-11-15,Pemasukan,8500000,Tunai,,Makan & Minum,,,',
    ])
  })

  it('names transfers, savings and debt moves', () => {
    const csv = transactionsToCsv([
      row({ type: 'transfer', category: null, toAccount: 'GoPay' }),
      row({ type: 'saving_withdrawal', category: null, goal: 'Dana Darurat' }),
      row({ type: 'debt_collect', category: null, person: 'Budi' }),
    ])
    expect(lines(csv).slice(1)).toEqual([
      '2026-11-15,Transfer,38000,Tunai,GoPay,,,,',
      '2026-11-15,Culik tabungan,38000,Tunai,,,Dana Darurat,,',
      '2026-11-15,Terima piutang,38000,Tunai,,,,Budi,',
    ])
  })

  it('quotes commas, quotes and line breaks', () => {
    const csv = transactionsToCsv([row({ note: 'Nasi "padang", es teh\nberdua' })])
    expect(csv).toContain(',"Nasi ""padang"", es teh\nberdua"\r\n')
  })

  it('keeps text that looks like a formula from running in a spreadsheet', () => {
    const csv = transactionsToCsv([
      row({ note: '=HYPERLINK("http://x")', account: '+62 rekening', category: '-diskon' }),
    ])
    expect(lines(csv)[1]).toBe(
      `2026-11-15,Pengeluaran,38000,'+62 rekening,,'-diskon,,,"'=HYPERLINK(""http://x"")"`,
    )
  })
})
