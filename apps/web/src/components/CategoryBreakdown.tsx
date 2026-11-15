import {
  type CategoryType,
  formatRupiah,
  type Transaction,
  totalsByCategory,
} from '@finance/shared'
import { Link } from 'react-router'
import { formatShare } from '../lib/format'
import { CategoryBadge } from './Badges'
import type { Lookups } from './TransactionRow'

type Props = {
  transactions: Transaction[]
  lookups: Lookups
  type: CategoryType
  month: string
  /** Show only the largest N categories and summarize the rest in one line. */
  limit?: number
}

/**
 * Ranked horizontal bars, largest first, in one hue (orange for expenses, aqua for income).
 * The category's own icon and name carry its identity; the amount and share are always
 * printed as text, so the bars never carry a value alone. Each row opens that category's
 * transactions for the month.
 */
export function CategoryBreakdown({ transactions, lookups, type, month, limit }: Props) {
  const totals = totalsByCategory(transactions, type)
  if (totals.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-slate-500 dark:text-slate-400">
        Belum ada {type === 'expense' ? 'pengeluaran' : 'pemasukan'} di bulan ini.
      </p>
    )
  }

  const sum = totals.reduce((total, t) => total + t.total, 0)
  const largest = totals[0]?.total ?? 1
  const shown = limit ? totals.slice(0, limit) : totals
  const rest = totals.slice(shown.length)
  const barColor = type === 'expense' ? 'bg-(--chart-expense)' : 'bg-(--chart-income)'

  return (
    <ul className="-mx-2">
      {shown.map((entry) => {
        const category = lookups.categories.get(entry.categoryId)
        const name = category?.name ?? 'Kategori terhapus'
        return (
          <li key={entry.categoryId}>
            <Link
              to={`/transaksi?bulan=${month}&kategori=${entry.categoryId}`}
              className="block rounded-xl px-2 py-2 transition-colors active:bg-slate-100 dark:active:bg-slate-800"
            >
              <span className="flex items-center gap-3">
                <CategoryBadge
                  icon={category?.icon ?? 'circle-ellipsis'}
                  color={category?.color ?? 'slate'}
                  size="sm"
                />
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline justify-between gap-2">
                    <span className="truncate text-sm font-medium">{name}</span>
                    <span className="shrink-0 text-sm font-semibold tabular-nums">
                      {formatRupiah(entry.total)}
                    </span>
                  </span>
                  <span className="mt-1.5 flex items-center gap-2">
                    <span className="h-2 flex-1">
                      <span
                        className={`block h-full rounded-r-[4px] ${barColor}`}
                        style={{ width: `${Math.max((entry.total / largest) * 100, 1)}%` }}
                      />
                    </span>
                    <span className="w-9 shrink-0 text-right text-xs text-slate-500 tabular-nums dark:text-slate-400">
                      {formatShare(entry.total / sum)}
                    </span>
                  </span>
                </span>
              </span>
            </Link>
          </li>
        )
      })}
      {rest.length > 0 && (
        <li className="px-2 pt-1 text-xs text-slate-500 dark:text-slate-400">
          +{rest.length} kategori lain · {formatRupiah(rest.reduce((t, r) => t + r.total, 0))}
        </li>
      )}
    </ul>
  )
}
