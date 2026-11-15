/**
 * Calendar helpers. Transaction dates are plain local dates ("2026-11-15"), months are
 * "2026-11" — no time zones involved once a date is picked.
 */

const pad = (n: number) => String(n).padStart(2, '0')

export const monthKeyPattern = /^\d{4}-(0[1-9]|1[0-2])$/

/** Local calendar date of a Date object as "YYYY-MM-DD". */
export function toDateKey(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

/** Local month of a Date object (or of a "YYYY-MM-DD" key) as "YYYY-MM". */
export function toMonthKey(date: Date | string): string {
  return typeof date === 'string' ? date.slice(0, 7) : toDateKey(date).slice(0, 7)
}

/** Move a "YYYY-MM" key by a number of months. */
export function shiftMonth(month: string, delta: number): string {
  const [year, mon] = month.split('-').map(Number) as [number, number]
  const index = year * 12 + (mon - 1) + delta
  return `${Math.floor(index / 12)}-${pad((index % 12) + 1)}`
}

/** Months from `from` to `to`, both included, oldest first. */
export function monthsBetween(from: string, to: string): string[] {
  const months: string[] = []
  for (let month = from; month <= to; month = shiftMonth(month, 1)) months.push(month)
  return months
}

/** Number of days in a "YYYY-MM" month. */
export function daysInMonth(month: string): number {
  const [year, mon] = month.split('-').map(Number) as [number, number]
  return new Date(year, mon, 0).getDate()
}

/** Half-open date range of a month: start inclusive, end exclusive. */
export function monthRange(month: string): { start: string; end: string } {
  return { start: `${month}-01`, end: `${shiftMonth(month, 1)}-01` }
}

/** Parse a "YYYY-MM-DD" key as a local date (midnight). */
export function fromDateKey(key: string): Date {
  const [year, month, day] = key.split('-').map(Number) as [number, number, number]
  return new Date(year, month - 1, day)
}

/** Whole days from one "YYYY-MM-DD" key to another (negative when `to` is earlier). */
export function daysBetween(from: string, to: string): number {
  return Math.round((fromDateKey(to).getTime() - fromDateKey(from).getTime()) / 86_400_000)
}

/** Add days to a "YYYY-MM-DD" key. */
export function shiftDate(key: string, days: number): string {
  const date = fromDateKey(key)
  date.setDate(date.getDate() + days)
  return toDateKey(date)
}
