import { type Account, type Category, formatRupiah, type Transaction } from '@finance/shared'
import { useMemo } from 'react'
import { Link } from 'react-router'
import { transactionTypes } from '../lib/visuals'
import { CategoryBadge, TransferBadge } from './Badges'

export type Lookups = {
  accounts: Map<string, Account>
  categories: Map<string, Category>
}

/** Id -> item maps so rows can show names without extra requests. */
export function useLookups(accounts: Account[] | undefined, categories: Category[] | undefined) {
  return useMemo<Lookups>(
    () => ({
      accounts: new Map((accounts ?? []).map((a) => [a.id, a])),
      categories: new Map((categories ?? []).map((c) => [c.id, c])),
    }),
    [accounts, categories],
  )
}

/** "+Rp 1.500.000" / "−Rp 38.000" / "Rp 200.000" (transfer). */
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

  let badge: React.ReactNode
  let title: string
  let detail: string
  if (t.type === 'transfer') {
    const target = lookups.accounts.get(t.toAccountId ?? '')?.name ?? 'Dompet terhapus'
    badge = <TransferBadge />
    title = t.note || 'Transfer'
    detail = `${account} → ${target}`
  } else {
    const category = lookups.categories.get(t.categoryId ?? '')
    badge = (
      <CategoryBadge
        icon={category?.icon ?? 'circle-ellipsis'}
        color={category?.color ?? 'slate'}
      />
    )
    title = category?.name ?? 'Tanpa kategori'
    detail = t.note ? `${t.note} · ${account}` : account
  }

  return (
    <Link
      to={`/transaksi/${t.id}`}
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
