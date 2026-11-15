import { formatRupiah, fromDateKey, shiftDate, toDateKey } from '@finance/shared'

const dayFormat = new Intl.DateTimeFormat('id-ID', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
})
const dateFormat = new Intl.DateTimeFormat('id-ID', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
})
const monthFormat = new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric' })
const shortMonthFormat = new Intl.DateTimeFormat('id-ID', { month: 'short' })
const percentFormat = new Intl.NumberFormat('id-ID', { style: 'percent', maximumFractionDigits: 0 })

/** "+Rp 1.500.000" / "−Rp 38.000" / "Rp 0" */
export function formatSignedRupiah(value: number): string {
  const sign = value > 0 ? '+' : value < 0 ? '−' : ''
  return `${sign}${formatRupiah(Math.abs(value))}`
}

/** "Okt" */
export function formatShortMonth(monthKey: string): string {
  return shortMonthFormat.format(fromDateKey(`${monthKey}-01`))
}

/** 0.456 -> "46%"; tiny non-zero shares show as "<1%" instead of a misleading "0%". */
export function formatShare(ratio: number): string {
  if (ratio > 0 && ratio < 0.005) return '<1%'
  return percentFormat.format(ratio)
}

export const todayKey = () => toDateKey(new Date())

/**
 * Heading for a day in a list: "Hari ini", "Kemarin", "Sabtu, 14 November", and with the year
 * for other years ("Rabu, 24 Desember 2025"), since search results can span years.
 */
export function formatDayHeading(dateKey: string, today = todayKey()): string {
  if (dateKey === today) return 'Hari ini'
  if (dateKey === shiftDate(today, -1)) return 'Kemarin'
  const label = dayFormat.format(fromDateKey(dateKey))
  return dateKey.slice(0, 4) === today.slice(0, 4) ? label : `${label} ${dateKey.slice(0, 4)}`
}

/** "15 Nov 2026" */
export function formatDate(dateKey: string): string {
  return dateFormat.format(fromDateKey(dateKey))
}

/** "November 2026" */
export function formatMonth(monthKey: string): string {
  return monthFormat.format(fromDateKey(`${monthKey}-01`))
}
