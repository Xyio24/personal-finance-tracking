import { fromDateKey, shiftDate, toDateKey } from '@finance/shared'

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

export const todayKey = () => toDateKey(new Date())

/** Heading for a day in a list: "Hari ini", "Kemarin", or "Sabtu, 14 November". */
export function formatDayHeading(dateKey: string, today = todayKey()): string {
  if (dateKey === today) return 'Hari ini'
  if (dateKey === shiftDate(today, -1)) return 'Kemarin'
  return dayFormat.format(fromDateKey(dateKey))
}

/** "15 Nov 2026" */
export function formatDate(dateKey: string): string {
  return dateFormat.format(fromDateKey(dateKey))
}

/** "November 2026" */
export function formatMonth(monthKey: string): string {
  return monthFormat.format(fromDateKey(`${monthKey}-01`))
}
