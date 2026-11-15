import type { Transaction } from './transactions'

type BalanceTransaction = Pick<Transaction, 'type' | 'amount' | 'accountId' | 'toAccountId'>

/** How a transaction changes one account's balance. */
export function balanceDelta(t: BalanceTransaction, accountId: string): number {
  let delta = 0
  if (t.accountId === accountId) delta += t.type === 'income' ? t.amount : -t.amount
  if (t.type === 'transfer' && t.toAccountId === accountId) delta += t.amount
  return delta
}

/** Current balance per account id: initial balance plus every transaction touching it. */
export function computeBalances(
  accounts: readonly { id: string; initialBalance: number }[],
  transactions: readonly BalanceTransaction[],
): Map<string, number> {
  const balances = new Map(accounts.map((a) => [a.id, a.initialBalance]))
  for (const t of transactions) {
    for (const id of [t.accountId, t.toAccountId]) {
      if (id && balances.has(id)) balances.set(id, (balances.get(id) ?? 0) + balanceDelta(t, id))
    }
  }
  return balances
}

/** Income and expense of a list of transactions. Transfers move money and count as neither. */
export function summarize(transactions: readonly Pick<Transaction, 'type' | 'amount'>[]) {
  let income = 0
  let expense = 0
  for (const t of transactions) {
    if (t.type === 'income') income += t.amount
    else if (t.type === 'expense') expense += t.amount
  }
  return { income, expense, net: income - expense }
}
