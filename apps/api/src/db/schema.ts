import { ACCOUNT_TYPES, CATEGORY_TYPES, TRANSACTION_TYPES } from '@finance/shared'
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

export const transactions = pgTable(
  'transactions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    type: transactionType('type').notNull(),
    amount: rupiah('amount').notNull(),
    /** Income lands here; expenses and transfers leave from here. */
    accountId: uuid('account_id')
      .notNull()
      .references(() => accounts.id),
    /** Transfers only: the receiving account. */
    toAccountId: uuid('to_account_id').references(() => accounts.id),
    /** Income and expense only. */
    categoryId: uuid('category_id').references(() => categories.id),
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
    check('transactions_amount_positive', sql`${table.amount} > 0`),
    // The database itself refuses half-filled rows, whatever the API does.
    check(
      'transactions_shape',
      sql`(${table.type} = 'transfer' and ${table.toAccountId} is not null and ${table.categoryId} is null and ${table.toAccountId} <> ${table.accountId})
        or (${table.type} <> 'transfer' and ${table.toAccountId} is null and ${table.categoryId} is not null)`,
    ),
  ],
)

export type UserRow = typeof users.$inferSelect
export type SessionRow = typeof sessions.$inferSelect
export type AccountRow = typeof accounts.$inferSelect
export type CategoryRow = typeof categories.$inferSelect
export type TransactionRow = typeof transactions.$inferSelect
