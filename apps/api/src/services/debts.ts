import type { Debt } from '@finance/shared'
import { and, asc, eq, inArray, ne, sql } from 'drizzle-orm'
import { db } from '../db/client'
import { debts, transactions } from '../db/schema'
import { toDebt } from '../lib/dto'

/** The transaction that opened a debt (money borrowed or lent), if money moved. */
export const OPENING_TYPES = ['debt_borrow', 'debt_lend'] as const
export const PAYMENT_TYPES = ['debt_repay', 'debt_collect'] as const

/** Every debt of a user with what has been paid back and the wallet it was opened with. */
export async function listDebts(userId: string): Promise<Debt[]> {
  const rows = await db
    .select({
      debt: debts,
      paid: sql<number>`coalesce(sum(${transactions.amount}) filter (where ${inArray(transactions.type, [...PAYMENT_TYPES])}), 0)`.mapWith(
        Number,
      ),
      accountId: sql<
        string | null
      >`(array_agg(${transactions.accountId}) filter (where ${inArray(transactions.type, [...OPENING_TYPES])}))[1]`,
    })
    .from(debts)
    .leftJoin(transactions, eq(transactions.debtId, debts.id))
    .where(eq(debts.userId, userId))
    .groupBy(debts.id)
    .orderBy(asc(debts.date), asc(debts.createdAt))

  return rows.map(({ debt, paid, accountId }) => toDebt(debt, paid, accountId))
}

export async function findDebt(userId: string, id: string) {
  return (await listDebts(userId)).find((debt) => debt.id === id)
}

/** What is still open on a debt, optionally ignoring one payment (the one being edited). */
export async function debtRemaining(debtId: string, excludeTransactionId?: string) {
  const [row] = await db
    .select({
      amount: debts.amount,
      paid: sql<number>`coalesce(sum(${transactions.amount}), 0)`.mapWith(Number),
    })
    .from(debts)
    .leftJoin(
      transactions,
      and(
        eq(transactions.debtId, debts.id),
        inArray(transactions.type, [...PAYMENT_TYPES]),
        excludeTransactionId ? ne(transactions.id, excludeTransactionId) : undefined,
      ),
    )
    .where(eq(debts.id, debtId))
    .groupBy(debts.id)
  return row ? Math.max(row.amount - row.paid, 0) : 0
}
