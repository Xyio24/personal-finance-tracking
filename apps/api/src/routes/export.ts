import { exportFileName, transactionsToCsv } from '@finance/shared'
import { desc, eq } from 'drizzle-orm'
import { alias } from 'drizzle-orm/pg-core'
import { Hono } from 'hono'
import { db } from '../db/client'
import { accounts, categories, debts, savingsGoals, transactions } from '../db/schema'
import { type AuthEnv, requireAuth } from '../middleware/auth'

/** Downloads of the user's own data. */
export const exportRoutes = new Hono<AuthEnv>()

exportRoutes.use(requireAuth)

const toAccounts = alias(accounts, 'to_accounts')

/** Every transaction, newest first, as a CSV file for Excel / Google Sheets. */
exportRoutes.get('/transactions.csv', async (c) => {
  const rows = await db
    .select({
      date: transactions.date,
      type: transactions.type,
      amount: transactions.amount,
      account: accounts.name,
      toAccount: toAccounts.name,
      category: categories.name,
      goal: savingsGoals.name,
      person: debts.person,
      note: transactions.note,
    })
    .from(transactions)
    .innerJoin(accounts, eq(accounts.id, transactions.accountId))
    .leftJoin(toAccounts, eq(toAccounts.id, transactions.toAccountId))
    .leftJoin(categories, eq(categories.id, transactions.categoryId))
    .leftJoin(savingsGoals, eq(savingsGoals.id, transactions.goalId))
    .leftJoin(debts, eq(debts.id, transactions.debtId))
    .where(eq(transactions.userId, c.get('user').id))
    .orderBy(desc(transactions.date), desc(transactions.createdAt))

  // The owner lives in Indonesia; the server's clock may be UTC.
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date())
  return c.body(transactionsToCsv(rows), 200, {
    'Content-Type': 'text/csv; charset=utf-8',
    'Content-Disposition': `attachment; filename="${exportFileName(today)}"`,
    // Personal financial data: never keep a copy in any cache.
    'Cache-Control': 'no-store',
  })
})
