import {
  type MonthlyTotal,
  monthlyReportQuerySchema,
  monthRange,
  monthsBetween,
} from '@finance/shared'
import { and, eq, gte, lt, sql } from 'drizzle-orm'
import { Hono } from 'hono'
import { db } from '../db/client'
import { transactions } from '../db/schema'
import { validate } from '../lib/validate'
import { type AuthEnv, requireAuth } from '../middleware/auth'

export const reportRoutes = new Hono<AuthEnv>()

reportRoutes.use(requireAuth)

/**
 * Income and expense per month from `from` to `to` (both included). Every month in the range
 * is present, with zeros when nothing was recorded; transfers count as neither.
 */
reportRoutes.get('/monthly', validate('query', monthlyReportQuerySchema), async (c) => {
  const { from, to } = c.req.valid('query')
  const month = sql<string>`to_char(${transactions.date}, 'YYYY-MM')`
  const sumOf = (type: 'income' | 'expense') =>
    sql<number>`coalesce(sum(${transactions.amount}) filter (where ${transactions.type} = ${type}), 0)`.mapWith(
      Number,
    )

  const rows = await db
    .select({ month, income: sumOf('income'), expense: sumOf('expense') })
    .from(transactions)
    .where(
      and(
        eq(transactions.userId, c.get('user').id),
        gte(transactions.date, monthRange(from).start),
        lt(transactions.date, monthRange(to).end),
      ),
    )
    .groupBy(month)

  const byMonth = new Map(rows.map((row) => [row.month, row]))
  const report: MonthlyTotal[] = monthsBetween(from, to).map((key) => ({
    month: key,
    income: byMonth.get(key)?.income ?? 0,
    expense: byMonth.get(key)?.expense ?? 0,
  }))
  return c.json(report)
})
