import {
  type Account,
  type Category,
  formatRupiah,
  type SavingsGoal,
  type Transaction,
} from '@finance/shared'
import { useMemo } from 'react'
import { Link } from 'react-router'
import { transactionTypes } from '../lib/visuals'
import { CategoryBadge, TransferBadge } from './Badges'

export type Lookups = {
  accounts: Map<string, Account>
  categories: Map<string, Category>
  goals: Map<string, SavingsGoal>
}

/** Id -> item maps so rows can show names without extra requests. */
export function useLookups(
  accounts: Account[] | undefined,
  categories: Category[] | undefined,
  goals?: SavingsGoal[] | undefined,
) {
  return useMemo<Lookups>(
    () => ({
      accounts: new Map((accounts ?? []).map((a) => [a.id, a])),
      categories: new Map((categories ?? []).map((c) => [c.id, c])),
      goals: new Map((goals ?? []).map((g) => [g.id, g])),
    }),
    [accounts, categories, goals],
  )
}

/** "+Rp 1.500.000" / "−Rp 38.000" / "Rp 200.000" (transfer, savings). */
export function signedAmount(transaction: Pick<Transaction, 'type' | 'amount'>) {
  return `${transactionTypes[transaction.type].sign}${formatRupiah(transaction.amount)}`
}

export function TransactionRow({
  transaction: t,
  lookups,
}: {
  transaction: Transaction
  lookups: Lookups
}) {
  const account = lookups.accounts.get(t.accountId)?.name ?? 'Dompet terhapus'
  const withNote = (text: string) => (t.note ? `${t.note} · ${text}` : text)

  let badge: React.ReactNode
  let title: string
  let detail: string
  // Savings moves are managed on their goal's page; everything else opens the edit form.
  let href = `/transaksi/${t.id}`

  if (t.type === 'transfer') {
    const target = lookups.accounts.get(t.toAccountId ?? '')?.name ?? 'Dompet terhapus'
    badge = <TransferBadge />
    title = t.note || 'Transfer'
    detail = `${account} → ${target}`
  } else if (t.type === 'saving_deposit' || t.type === 'saving_withdrawal') {
    const goal = lookups.goals.get(t.goalId ?? '')
    const name = goal?.name ?? 'tabungan'
    badge = <CategoryBadge icon={goal?.icon ?? 'piggy-bank'} color={goal?.color ?? 'emerald'} />
    title = t.type === 'saving_deposit' ? `Isi ${name}` : `Culik ${name} 🥷`
    detail = withNote(t.type === 'saving_deposit' ? `dari ${account}` : `ke ${account}`)
    href = `/tabungan/${t.goalId}`
  } else {
    const category = lookups.categories.get(t.categoryId ?? '')
    badge = (
      <CategoryBadge
        icon={category?.icon ?? 'circle-ellipsis'}
        color={category?.color ?? 'slate'}
      />
    )
    title = category?.name ?? 'Tanpa kategori'
    detail = withNote(account)
  }

  return (
    <Link
      to={href}
      className="flex items-center gap-3 px-4 py-3 active:bg-slate-50 dark:active:bg-slate-800"
    >
      {badge}
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium">{title}</span>
        <span className="block truncate text-xs text-slate-500 dark:text-slate-400">{detail}</span>
      </span>
      <span
        className={`shrink-0 text-sm font-semibold tabular-nums ${transactionTypes[t.type].amountClass}`}
      >
        {signedAmount(t)}
      </span>
    </Link>
  )
}
