import type { TransactionInput } from '@finance/shared'
import { and, eq, inArray } from 'drizzle-orm'
import { db } from '../db/client'
import { accounts, categories, savingsGoals, type TransactionRow } from '../db/schema'
import type { ApiErrorCode } from '../lib/validate'
import { goalBalance } from './savings'

/**
 * Removing or shrinking a deposit must not push its goal below zero: part of that money may
 * already have been taken out again with a "culik". `replacement` is the edited version, if
 * the transaction is being changed rather than deleted.
 */
export async function keepsGoalPositive(
  existing: TransactionRow,
  replacement?: TransactionInput,
): Promise<boolean> {
  if (existing.type !== 'saving_deposit' || !existing.goalId) return true
  let balance = await goalBalance(existing.goalId, existing.id)
  if (replacement?.type === 'saving_deposit' && replacement.goalId === existing.goalId) {
    balance += replacement.amount
  }
  if (replacement?.type === 'saving_withdrawal' && replacement.goalId === existing.goalId) {
    balance -= replacement.amount
  }
  return balance >= 0
}

/** Column values for a transaction row; fields that don't apply to the type are cleared. */
export function toTransactionValues(input: TransactionInput) {
  return {
    type: input.type,
    amount: input.amount,
    accountId: input.accountId,
    toAccountId: input.type === 'transfer' ? input.toAccountId : null,
    categoryId: input.type === 'income' || input.type === 'expense' ? input.categoryId : null,
    goalId:
      input.type === 'saving_deposit' || input.type === 'saving_withdrawal' ? input.goalId : null,
    date: input.date,
    note: input.note || null,
  }
}

/**
 * Checks that the wallets, category and savings goal belong to the user and fit the
 * transaction. Archived ones are refused, except those the transaction being edited already
 * uses, so old entries stay editable after something is retired. A withdrawal ("culik") can
 * never take out more than the goal holds.
 */
export async function checkReferences(
  userId: string,
  input: TransactionInput,
  existing?: TransactionRow,
): Promise<ApiErrorCode | null> {
  const accountIds =
    input.type === 'transfer' ? [input.accountId, input.toAccountId] : [input.accountId]
  const found = await db
    .select({ id: accounts.id, archivedAt: accounts.archivedAt })
    .from(accounts)
    .where(and(eq(accounts.userId, userId), inArray(accounts.id, accountIds)))
  if (found.length !== accountIds.length) return 'invalid_account'

  const kept = new Set([existing?.accountId, existing?.toAccountId])
  if (found.some((account) => account.archivedAt && !kept.has(account.id))) {
    return 'archived_account'
  }

  if (input.type === 'income' || input.type === 'expense') {
    const [category] = await db
      .select({ id: categories.id, type: categories.type, archivedAt: categories.archivedAt })
      .from(categories)
      .where(and(eq(categories.userId, userId), eq(categories.id, input.categoryId)))
    if (!category || category.type !== input.type) return 'invalid_category'
    if (category.archivedAt && category.id !== existing?.categoryId) return 'archived_category'
  }

  if (input.type === 'saving_deposit' || input.type === 'saving_withdrawal') {
    const [goal] = await db
      .select({ id: savingsGoals.id, archivedAt: savingsGoals.archivedAt })
      .from(savingsGoals)
      .where(and(eq(savingsGoals.userId, userId), eq(savingsGoals.id, input.goalId)))
    if (!goal) return 'invalid_goal'
    if (goal.archivedAt && goal.id !== existing?.goalId) return 'archived_goal'
    if (input.type === 'saving_withdrawal') {
      const available = await goalBalance(goal.id, existing?.id)
      if (input.amount > available) return 'insufficient_savings'
    }
  }

  return null
}
