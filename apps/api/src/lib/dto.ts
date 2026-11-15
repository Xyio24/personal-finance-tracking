import type {
  Account,
  Category,
  CategoryColor,
  CategoryIcon,
  Debt,
  SavingsGoal,
  Transaction,
} from '@finance/shared'
import type { AccountRow, CategoryRow, DebtRow, SavingsGoalRow, TransactionRow } from '../db/schema'

export function toDebt(row: DebtRow, paid: number, accountId: string | null): Debt {
  const writtenOff = row.writtenOffAt !== null
  return {
    id: row.id,
    direction: row.direction,
    person: row.person,
    amount: row.amount,
    paid,
    remaining: writtenOff ? 0 : Math.max(row.amount - paid, 0),
    date: row.date,
    dueDate: row.dueDate,
    note: row.note,
    accountId,
    writtenOff,
    createdAt: row.createdAt.toISOString(),
  }
}

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
    debtId: row.debtId,
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
