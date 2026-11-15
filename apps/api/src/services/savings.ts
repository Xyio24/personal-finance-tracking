import type { SavingsGoal } from '@finance/shared'
import { and, asc, eq, ne, sql } from 'drizzle-orm'
import { db } from '../db/client'
import { savingsGoals, transactions } from '../db/schema'
import { toGoal } from '../lib/dto'

/** + for a deposit ("isi"), − for a withdrawal ("culik"), 0 for anything else. */
const goalDelta = sql`case
    when ${transactions.type} = 'saving_deposit' then ${transactions.amount}
    when ${transactions.type} = 'saving_withdrawal' then -${transactions.amount}
    else 0
  end`

/** Every savings goal of a user with its current amount and recent saving pace. */
export async function listGoals(userId: string): Promise<SavingsGoal[]> {
  const rows = await db
    .select({
      goal: savingsGoals,
      saved: sql<number>`coalesce(sum(${goalDelta}), 0)`.mapWith(Number),
      savedLast90Days:
        sql<number>`coalesce(sum(${goalDelta}) filter (where ${transactions.date} >= current_date - 90), 0)`.mapWith(
          Number,
        ),
    })
    .from(savingsGoals)
    .leftJoin(transactions, eq(transactions.goalId, savingsGoals.id))
    .where(eq(savingsGoals.userId, userId))
    .groupBy(savingsGoals.id)
    .orderBy(asc(savingsGoals.createdAt), asc(savingsGoals.id))

  return rows.map(({ goal, saved, savedLast90Days }) =>
    toGoal(goal, goal.initialAmount + saved, savedLast90Days),
  )
}

export async function findGoal(userId: string, id: string) {
  return (await listGoals(userId)).find((goal) => goal.id === id)
}

/**
 * Amount in a goal, optionally leaving one transaction out (the one being edited), so a
 * withdrawal can be checked against what is really there.
 */
export async function goalBalance(goalId: string, excludeTransactionId?: string) {
  const [row] = await db
    .select({
      initial: savingsGoals.initialAmount,
      saved: sql<number>`coalesce(sum(${goalDelta}), 0)`.mapWith(Number),
    })
    .from(savingsGoals)
    .leftJoin(
      transactions,
      and(
        eq(transactions.goalId, savingsGoals.id),
        excludeTransactionId ? ne(transactions.id, excludeTransactionId) : undefined,
      ),
    )
    .where(eq(savingsGoals.id, goalId))
    .groupBy(savingsGoals.id)
  return row ? row.initial + row.saved : 0
}

export async function isGoalUsed(userId: string, goalId: string) {
  const [used] = await db
    .select({ id: transactions.id })
    .from(transactions)
    .where(and(eq(transactions.userId, userId), eq(transactions.goalId, goalId)))
    .limit(1)
  return used !== undefined
}
