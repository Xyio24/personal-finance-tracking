import type {
  Account,
  Category,
  CategoryColor,
  CategoryIcon,
  SavingsGoal,
  Transaction,
} from '@finance/shared'
import type { AccountRow, CategoryRow, SavingsGoalRow, TransactionRow } from '../db/schema'

// Database rows -> the JSON shapes in @finance/shared. Internal columns (user_id, sort order,
// timestamps nobody needs) stay on the server.

export function toAccount(row: AccountRow, balance: number): Account {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    initialBalance: row.initialBalance,
    balance,
    archived: row.archivedAt !== null,
    createdAt: row.createdAt.toISOString(),
  }
}

export function toCategory(row: CategoryRow): Category {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    // Only values from CATEGORY_ICONS / CATEGORY_COLORS are ever written (validated input).
    icon: row.icon as CategoryIcon,
    color: row.color as CategoryColor,
    archived: row.archivedAt !== null,
    createdAt: row.createdAt.toISOString(),
  }
}

export function toTransaction(row: TransactionRow): Transaction {
  return {
    id: row.id,
    type: row.type,
    amount: row.amount,
    accountId: row.accountId,
    toAccountId: row.toAccountId,
    categoryId: row.categoryId,
    goalId: row.goalId,
    date: row.date,
    note: row.note,
    createdAt: row.createdAt.toISOString(),
  }
}

export function toGoal(row: SavingsGoalRow, balance: number, savedLast90Days: number): SavingsGoal {
  return {
    id: row.id,
    name: row.name,
    icon: row.icon as CategoryIcon,
    color: row.color as CategoryColor,
    targetAmount: row.targetAmount,
    deadline: row.deadline,
    initialAmount: row.initialAmount,
    balance,
    savedLast90Days,
    archived: row.archivedAt !== null,
    createdAt: row.createdAt.toISOString(),
  }
}
