import { z } from 'zod'
import type { CategoryType } from './categories'
import { monthKeyPattern, shiftMonth } from './dates'
import type { Transaction } from './transactions'

/** Longest range the monthly report accepts. */
export const MAX_REPORT_MONTHS = 24

const monthKey = z.string().regex(monthKeyPattern)

/** GET /api/reports/monthly?from=YYYY-MM&to=YYYY-MM (both included). */
export const monthlyReportQuerySchema = z
  .object({ from: monthKey, to: monthKey })
  .refine((range) => range.from <= range.to, { message: 'from must not be after to' })
  .refine((range) => shiftMonth(range.from, MAX_REPORT_MONTHS - 1) >= range.to, {
    message: `at most ${MAX_REPORT_MONTHS} months`,
  })

/** Income and expense of one month. Transfers are neither. Months without entries are 0. */
export type MonthlyTotal = { month: string; income: number; expense: number }

export type CategoryTotal = { categoryId: string; total: number; count: number }

/** Totals per category for one side (income or expense), largest first. */
export function totalsByCategory(
  transactions: readonly Pick<Transaction, 'type' | 'amount' | 'categoryId'>[],
  type: CategoryType,
): CategoryTotal[] {
  const totals = new Map<string, CategoryTotal>()
  for (const t of transactions) {
    if (t.type !== type || !t.categoryId) continue
    const entry = totals.get(t.categoryId) ?? { categoryId: t.categoryId, total: 0, count: 0 }
    entry.total += t.amount
    entry.count += 1
    totals.set(t.categoryId, entry)
  }
  return [...totals.values()].sort((a, b) => b.total - a.total)
}

const compactFormat = new Intl.NumberFormat('id-ID', {
  notation: 'compact',
  maximumFractionDigits: 1,
})

/** Short amounts for chart axes and tight spots: 1250000 -> "1,3 jt", 450000 -> "450 rb". */
export function formatCompact(amount: number): string {
  return compactFormat.format(amount)
}
