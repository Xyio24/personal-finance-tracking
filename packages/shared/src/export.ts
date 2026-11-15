import type { TransactionType } from './transactions'

/** One transaction as a spreadsheet row: names instead of ids. */
export type ExportRow = {
  date: string
  type: TransactionType
  amount: number
  account: string
  toAccount: string | null
  category: string | null
  goal: string | null
  person: string | null
  note: string | null
}

export const EXPORT_TYPE_LABELS: Record<TransactionType, string> = {
  income: 'Pemasukan',
  expense: 'Pengeluaran',
  transfer: 'Transfer',
  saving_deposit: 'Isi tabungan',
  saving_withdrawal: 'Culik tabungan',
  debt_borrow: 'Pinjam',
  debt_lend: 'Pinjamkan',
  debt_repay: 'Bayar hutang',
  debt_collect: 'Terima piutang',
}

const HEADER = [
  'Tanggal',
  'Jenis',
  'Jumlah',
  'Dompet',
  'Dompet tujuan',
  'Kategori',
  'Tabungan',
  'Orang',
  'Catatan',
]

/**
 * One CSV cell. Text that a spreadsheet would run as a formula (=, +, -, @ at the start) gets
 * a leading apostrophe, so a note like "=HYPERLINK(...)" stays plain text when opened.
 */
function cell(value: string | number | null): string {
  if (value === null) return ''
  if (typeof value === 'number') return String(value)
  const text = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text
}

/**
 * RFC 4180 CSV, newest first as given. Starts with a UTF-8 BOM so Excel reads names and notes
 * with accents or emoji correctly; amounts are plain whole rupiah so they sum as numbers.
 */
export function transactionsToCsv(rows: readonly ExportRow[]): string {
  const lines = [
    HEADER,
    ...rows.map((row) => [
      row.date,
      EXPORT_TYPE_LABELS[row.type],
      row.amount,
      row.account,
      row.toAccount,
      row.category,
      row.goal,
      row.person,
      row.note,
    ]),
  ]
  return `﻿${lines.map((line) => line.map(cell).join(',')).join('\r\n')}\r\n`
}

/** "keuangan-2026-11-15.csv" */
export const exportFileName = (dateKey: string) => `keuangan-${dateKey}.csv`
