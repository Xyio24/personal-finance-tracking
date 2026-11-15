import {
  formatRupiah,
  monthKeyPattern,
  shiftMonth,
  summarize,
  type Transaction,
  toMonthKey,
} from '@finance/shared'
import { ChevronLeft, ChevronRight, ReceiptText } from 'lucide-react'
import { Link, useSearchParams } from 'react-router'
import { PageHeader } from '../components/PageHeader'
import { ListSkeleton, LoadError } from '../components/QueryState'
import { TransactionRow, useLookups } from '../components/TransactionRow'
import { cardClass, primaryButtonClass } from '../components/ui'
import { formatDayHeading, formatMonth } from '../lib/format'
import { useAccounts, useCategories, useMonthTransactions } from '../lib/queries'

/** Transactions grouped by day, newest day first (the API already sorts them). */
function groupByDay(transactions: Transaction[]) {
  const groups: { date: string; items: Transaction[] }[] = []
  for (const t of transactions) {
    const last = groups.at(-1)
    if (last?.date === t.date) last.items.push(t)
    else groups.push({ date: t.date, items: [t] })
  }
  return groups
}

const signed = (value: number) =>
  `${value > 0 ? '+' : value < 0 ? '−' : ''}${formatRupiah(Math.abs(value))}`

export function TransactionsPage() {
  const [params, setParams] = useSearchParams()
  const currentMonth = toMonthKey(new Date())
  const requested = params.get('bulan') ?? ''
  const month = monthKeyPattern.test(requested) ? requested : currentMonth
  const setMonth = (next: string) =>
    setParams(next === currentMonth ? {} : { bulan: next }, { replace: true })

  const transactions = useMonthTransactions(month)
  const accounts = useAccounts()
  const categories = useCategories()
  const lookups = useLookups(accounts.data, categories.data)
  const totals = summarize(transactions.data ?? [])
  const failed = [transactions, accounts, categories].find((q) => q.isError)
  const list = accounts.data && categories.data ? transactions.data : undefined

  return (
    <>
      <PageHeader title="Transaksi" />

      <div className={`mx-4 flex items-center justify-between p-1.5 ${cardClass}`}>
        <button
          type="button"
          aria-label="Bulan sebelumnya"
          onClick={() => setMonth(shiftMonth(month, -1))}
          className="rounded-xl p-2 text-slate-600 active:bg-slate-100 dark:text-slate-300 dark:active:bg-slate-800"
        >
          <ChevronLeft className="size-5" aria-hidden />
        </button>
        <h2 className="font-semibold" aria-live="polite">
          {formatMonth(month)}
        </h2>
        <button
          type="button"
          aria-label="Bulan berikutnya"
          onClick={() => setMonth(shiftMonth(month, 1))}
          className="rounded-xl p-2 text-slate-600 active:bg-slate-100 dark:text-slate-300 dark:active:bg-slate-800"
        >
          <ChevronRight className="size-5" aria-hidden />
        </button>
      </div>

      <section className={`mx-4 mt-3 p-4 ${cardClass}`} aria-label="Ringkasan bulan">
        <dl className="grid grid-cols-2 gap-4">
          <div>
            <dt className="text-xs text-slate-500 dark:text-slate-400">Pemasukan</dt>
            <dd className="mt-0.5 truncate font-semibold text-emerald-600 tabular-nums dark:text-emerald-400">
              {formatRupiah(totals.income)}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500 dark:text-slate-400">Pengeluaran</dt>
            <dd className="mt-0.5 truncate font-semibold text-rose-600 tabular-nums dark:text-rose-400">
              {formatRupiah(totals.expense)}
            </dd>
          </div>
        </dl>
        <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3 text-sm dark:border-slate-800">
          <span className="text-slate-500 dark:text-slate-400">Selisih</span>
          <span className="font-semibold tabular-nums">{signed(totals.net)}</span>
        </div>
      </section>

      <div className="mt-5">
        {failed ? (
          <LoadError error={failed.error} onRetry={() => failed.refetch()} />
        ) : !list ? (
          <ListSkeleton />
        ) : list.length === 0 ? (
          <div className={`mx-4 flex flex-col items-center px-6 py-10 text-center ${cardClass}`}>
            <ReceiptText className="size-10 text-slate-300 dark:text-slate-600" aria-hidden />
            <p className="mt-3 font-medium">Belum ada transaksi di {formatMonth(month)}</p>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Catat pemasukan atau pengeluaran pertamamu.
            </p>
            <Link
              to="/transaksi/baru?type=expense"
              className={`${primaryButtonClass} mt-5 w-auto px-6`}
            >
              Catat transaksi
            </Link>
          </div>
        ) : (
          <div className="space-y-5">
            {groupByDay(list).map((group) => {
              const day = summarize(group.items)
              return (
                <section key={group.date}>
                  <div className="mx-4 mb-1.5 flex items-baseline justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
                    <h3>{formatDayHeading(group.date)}</h3>
                    {/* Transfers only move money between wallets: no day total for those. */}
                    {(day.income > 0 || day.expense > 0) && (
                      <span className="tabular-nums">{signed(day.net)}</span>
                    )}
                  </div>
                  <ul
                    className={`mx-4 divide-y divide-slate-100 overflow-hidden dark:divide-slate-800 ${cardClass}`}
                  >
                    {group.items.map((t) => (
                      <li key={t.id}>
                        <TransactionRow transaction={t} lookups={lookups} />
                      </li>
                    ))}
                  </ul>
                </section>
              )
            })}
          </div>
        )}
      </div>
    </>
  )
}
