import type { Account } from '@finance/shared'
import { and, asc, eq, or, sql } from 'drizzle-orm'
import { db } from '../db/client'
import { accounts, transactions } from '../db/schema'
import { toAccount } from '../lib/dto'

/**
 * Every account of a user with its current balance, computed in one query:
 * initial balance + income - expenses - transfers out + transfers in - money put into savings
 * + money taken back out of savings.
 */
export async function listAccounts(userId: string): Promise<Account[]> {
  // A transfer joins twice (once per side); each case only counts the side it belongs to.
  const delta = sql<number>`coalesce(sum(
      case
        when ${transactions.accountId} = ${accounts.id}
          and ${transactions.type} in ('income', 'saving_withdrawal') then ${transactions.amount}
        when ${transactions.accountId} = ${accounts.id} then -${transactions.amount}
        else 0
      end
      + case when ${transactions.toAccountId} = ${accounts.id} then ${transactions.amount} else 0 end
    ), 0)`.mapWith(Number)

  const rows = await db
    .select({ account: accounts, delta })
    .from(accounts)
    .leftJoin(
      transactions,
      or(eq(transactions.accountId, accounts.id), eq(transactions.toAccountId, accounts.id)),
    )
    .where(eq(accounts.userId, userId))
    .groupBy(accounts.id)
    .orderBy(asc(accounts.createdAt), asc(accounts.id))

  return rows.map(({ account, delta }) => toAccount(account, account.initialBalance + delta))
}

export async function findAccount(userId: string, id: string): Promise<Account | undefined> {
  return (await listAccounts(userId)).find((account) => account.id === id)
}

/** True when any transaction (either side of a transfer) uses the account. */
export async function isAccountUsed(userId: string, id: string): Promise<boolean> {
  const [used] = await db
    .select({ id: transactions.id })
    .from(transactions)
    .where(
      and(
        eq(transactions.userId, userId),
        or(eq(transactions.accountId, id), eq(transactions.toAccountId, id)),
      ),
    )
    .limit(1)
  return used !== undefined
}
