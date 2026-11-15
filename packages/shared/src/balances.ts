import type { Transaction } from './transactions'

type BalanceTransaction = Pick<Transaction, 'type' | 'amount' | 'accountId' | 'toAccountId'>

/** How a transaction changes one wallet's balance. */
export function balanceDelta(t: BalanceTransaction, accountId: string): number {
  let delta = 0
  if (t.accountId === accountId) {
    // Money arrives in the wallet with income and with a withdrawal from savings ("culik").
    delta += t.type === 'income' || t.type === 'saving_withdrawal' ? t.amount : -t.amount
  }
  if (t.type === 'transfer' && t.toAccountId === accountId) delta += t.amount
  return delta
}

/** Current balance per wallet id: initial balance plus every transaction touching it. */
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

/** How a transaction changes its savings goal: + for "isi", − for "culik", 0 otherwise. */
export function goalDelta(t: Pick<Transaction, 'type' | 'amount'>): number {
  if (t.type === 'saving_deposit') return t.amount
  if (t.type === 'saving_withdrawal') return -t.amount
  return 0
}

/** Current amount per savings goal id: initial amount plus deposits minus withdrawals. */
export function computeGoalBalances(
  goals: readonly { id: string; initialAmount: number }[],
  transactions: readonly Pick<Transaction, 'type' | 'amount' | 'goalId'>[],
): Map<string, number> {
  const balances = new Map(goals.map((g) => [g.id, g.initialAmount]))
  for (const t of transactions) {
    if (t.goalId && balances.has(t.goalId)) {
      balances.set(t.goalId, (balances.get(t.goalId) ?? 0) + goalDelta(t))
    }
  }
  return balances
}

/**
 * Income and expense of a list of transactions. Transfers and savings deposits/withdrawals
 * only move money around and count as neither.
 */
export function summarize(transactions: readonly Pick<Transaction, 'type' | 'amount'>[]) {
  let income = 0
  let expense = 0
  for (const t of transactions) {
    if (t.type === 'income') income += t.amount
    else if (t.type === 'expense') expense += t.amount
  }
  return { income, expense, net: income - expense }
}
