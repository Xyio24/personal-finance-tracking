import { ACCOUNT_TYPES, CATEGORY_TYPES, DEBT_DIRECTIONS, TRANSACTION_TYPES } from '@finance/shared'
import { sql } from 'drizzle-orm'
import {
  bigint,
  check,
  date,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core'

const timestamps = {
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}

/** Whole rupiah. bigint keeps every sum exact; mode "number" is safe far beyond Rp 1 triliun. */
const rupiah = (name: string) => bigint(name, { mode: 'number' })

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  /** Google's stable account id ("sub" claim). Emails can change, this can't. */
  googleSub: text('google_sub').notNull().unique(),
  email: text('email').notNull().unique(),
  name: text('name'),
  avatarUrl: text('avatar_url'),
  ...timestamps,
})

export const sessions = pgTable(
  'sessions',
  {
    /** SHA-256 hash of the session token. The raw token only lives in the user's cookie. */
    id: text('id').primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('sessions_user_id_idx').on(table.userId)],
)

export const accountType = pgEnum('account_type', ACCOUNT_TYPES)
export const categoryType = pgEnum('category_type', CATEGORY_TYPES)
export const transactionType = pgEnum('transaction_type', TRANSACTION_TYPES)

/** Wallets: cash, bank accounts, e-wallets. The balance is computed, never stored. */
export const accounts = pgTable(
  'accounts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    type: accountType('type').notNull(),
    initialBalance: rupiah('initial_balance').notNull().default(0),
    /** Archived accounts keep their history but can't receive new transactions. */
    archivedAt: timestamp('archived_at', { withTimezone: true }),
    ...timestamps,
  },
  (table) => [index('accounts_user_id_idx').on(table.userId)],
)

export const categories = pgTable(
  'categories',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    type: categoryType('type').notNull(),
    icon: text('icon').notNull(),
    color: text('color').notNull(),
    sortOrder: integer('sort_order').notNull().default(0),
    archivedAt: timestamp('archived_at', { withTimezone: true }),
    ...timestamps,
  },
  (table) => [index('categories_user_id_idx').on(table.userId)],
)

/** Savings goals ("pos tabungan"). The amount saved is computed, never stored. */
export const savingsGoals = pgTable(
  'savings_goals',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    icon: text('icon').notNull(),
    color: text('color').notNull(),
    /** Optional target; null for an open-ended pot. */
    targetAmount: rupiah('target_amount'),
    /** Optional local date to reach the target by. */
    deadline: date('deadline', { mode: 'string' }),
    /** Already saved before tracking started. */
    initialAmount: rupiah('initial_amount').notNull().default(0),
    archivedAt: timestamp('archived_at', { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    index('savings_goals_user_id_idx').on(table.userId),
    check(
      'savings_goals_amounts',
      sql`(${table.targetAmount} is null or ${table.targetAmount} > 0) and ${table.initialAmount} >= 0`,
    ),
  ],
)

export const debtDirection = pgEnum('debt_direction', DEBT_DIRECTIONS)

/**
 * Debts: "hutang" (payable, you owe) and "piutang" (receivable, you are owed). What has been
 * paid and what is left are computed from the payment transactions, never stored.
 */
export const debts = pgTable(
  'debts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    direction: debtDirection('direction').notNull(),
    person: text('person').notNull(),
    amount: rupiah('amount').notNull(),
    /** When the money was borrowed or lent (local date). */
    date: date('date', { mode: 'string' }).notNull(),
    dueDate: date('due_date', { mode: 'string' }),
    note: text('note'),
    /** "Ikhlaskan" / "Dianggap lunas": what was left is no longer expected. */
    writtenOffAt: timestamp('written_off_at', { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    index('debts_user_id_idx').on(table.userId),
    check('debts_amount_positive', sql`${table.amount} > 0`),
  ],
)

export const transactions = pgTable(
  'transactions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    type: transactionType('type').notNull(),
    amount: rupiah('amount').notNull(),
    /**
     * Income and savings withdrawals land here; expenses, transfers and savings deposits leave
     * from here.
     */
    accountId: uuid('account_id')
      .notNull()
      .references(() => accounts.id),
    /** Transfers only: the receiving account. */
    toAccountId: uuid('to_account_id').references(() => accounts.id),
    /** Income and expense only. */
    categoryId: uuid('category_id').references(() => categories.id),
    /** Savings deposits and withdrawals only. */
    goalId: uuid('goal_id').references(() => savingsGoals.id),
    /** Debt openings and payments only. */
    debtId: uuid('debt_id').references(() => debts.id),
    /** Local calendar date chosen by the user (no time zone). */
    date: date('date', { mode: 'string' }).notNull(),
    note: text('note'),
    ...timestamps,
  },
  (table) => [
    index('transactions_user_date_idx').on(table.userId, table.date),
    index('transactions_account_idx').on(table.accountId),
    index('transactions_to_account_idx').on(table.toAccountId),
    index('transactions_category_idx').on(table.categoryId),
    index('transactions_goal_idx').on(table.goalId),
    index('transactions_debt_idx').on(table.debtId),
    check('transactions_amount_positive', sql`${table.amount} > 0`),
    // The database itself refuses half-filled rows, whatever the API does. The type is
    // compared as text: migrations run in one transaction, and a freshly added enum value
    // cannot be used as an enum inside the transaction that adds it.
    check(
      'transactions_shape',
      sql`(${table.type}::text = 'transfer' and ${table.toAccountId} is not null and ${table.categoryId} is null and ${table.goalId} is null and ${table.debtId} is null and ${table.toAccountId} <> ${table.accountId})
        or (${table.type}::text in ('income', 'expense') and ${table.categoryId} is not null and ${table.toAccountId} is null and ${table.goalId} is null and ${table.debtId} is null)
        or (${table.type}::text in ('saving_deposit', 'saving_withdrawal') and ${table.goalId} is not null and ${table.toAccountId} is null and ${table.categoryId} is null and ${table.debtId} is null)
        or (${table.type}::text in ('debt_borrow', 'debt_lend', 'debt_repay', 'debt_collect') and ${table.debtId} is not null and ${table.toAccountId} is null and ${table.categoryId} is null and ${table.goalId} is null)`,
    ),
  ],
)

export type UserRow = typeof users.$inferSelect
export type SessionRow = typeof sessions.$inferSelect
export type AccountRow = typeof accounts.$inferSelect
export type CategoryRow = typeof categories.$inferSelect
export type TransactionRow = typeof transactions.$inferSelect
export type SavingsGoalRow = typeof savingsGoals.$inferSelect
export type DebtRow = typeof debts.$inferSelect
