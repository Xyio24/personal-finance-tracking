import { debtStatus, debtTotals, formatRupiah, summarize, toMonthKey } from '@finance/shared'
import { PiggyBank } from 'lucide-react'
import { Fragment } from 'react'
import { Link } from 'react-router'
import { AccountBadge } from '../components/Badges'
import { CategoryBreakdown } from '../components/CategoryBreakdown'
import { DebtStatusPill, debtTitle, PersonAvatar } from '../components/DebtVisuals'
import { PageHeader } from '../components/PageHeader'
import { ListSkeleton, LoadError } from '../components/QueryState'
import { TransactionRow, useLookups } from '../components/TransactionRow'
import { cardClass } from '../components/ui'
import { useCurrentUser } from '../lib/auth'
import { todayKey } from '../lib/format'
import {
  useAccounts,
  useCategories,
  useDebts,
  useMonthTransactions,
  useSavingsGoals,
} from '../lib/queries'

function greeting(date = new Date()) {
  const hour = date.getHours()
  if (hour >= 4 && hour < 11) return 'Selamat pagi'
  if (hour >= 11 && hour < 15) return 'Selamat siang'
  if (hour >= 15 && hour < 18) return 'Selamat sore'
  return 'Selamat malam'
}

const linkClass = 'text-sm font-medium text-emerald-600 dark:text-emerald-400'

export function HomePage() {
  const user = useCurrentUser()
  const firstName = user.name?.split(' ')[0] ?? 'kamu'
  const month = toMonthKey(new Date())

  const accounts = useAccounts()
  const categories = useCategories()
  const goals = useSavingsGoals()
  const debts = useDebts()
  const transactions = useMonthTransactions(month)
  const lookups = useLookups(accounts.data, categories.data, goals.data, debts.data)

  const walletTotal = accounts.data?.reduce((sum, a) => sum + a.balance, 0)
  const savingsTotal = goals.data?.reduce((sum, g) => sum + g.balance, 0)
  const owed = debts.data && debtTotals(debts.data)
  // Money in savings left the wallets but is still yours; piutang is yours to collect and
  // hutang is not yours to keep. Borrowing into a wallet therefore leaves this unchanged.
  const netWorth =
    walletTotal === undefined || savingsTotal === undefined || !owed
      ? undefined
      : walletTotal + savingsTotal + owed.net
  const worthParts = [
    `Dompet ${formatRupiah(walletTotal ?? 0)}`,
    `Tabungan ${formatRupiah(savingsTotal ?? 0)}`,
    owed && owed.receivable > 0 && `Piutang ${formatRupiah(owed.receivable)}`,
    owed && owed.payable > 0 && `Hutang −${formatRupiah(owed.payable)}`,
  ].filter((part): part is string => Boolean(part))

  const today = todayKey()
  const dueDebts = (debts.data ?? [])
    .map((debt) => ({ debt, status: debtStatus(debt, today) }))
    .filter(({ status }) => status === 'overdue' || status === 'due_soon')
    .sort((a, b) => (a.debt.dueDate ?? '').localeCompare(b.debt.dueDate ?? ''))
  const activeAccounts = accounts.data?.filter((a) => !a.archived) ?? []
  const totals = summarize(transactions.data ?? [])
  const recent = transactions.data?.slice(0, 5) ?? []
  const listFailed = [transactions, categories].find((q) => q.isError)

  return (
    <>
      <PageHeader subtitle={greeting()} title={`Halo, ${firstName} 👋`} />

      <section
        aria-labelledby="home-worth"
        className="mx-4 rounded-3xl bg-linear-to-br from-emerald-600 to-emerald-800 p-5 text-white shadow-lg shadow-emerald-600/20"
      >
        <p id="home-worth" className="text-sm text-emerald-100">
          Kekayaan bersih
        </p>
        <p className="mt-1 truncate text-3xl font-bold tracking-tight">
          {netWorth === undefined ? (
            <span className="inline-block h-9 w-48 animate-pulse rounded-lg bg-white/20" />
          ) : (
            formatRupiah(netWorth)
          )}
        </p>
        {netWorth !== undefined && (
          <p className="mt-1 text-xs leading-relaxed text-emerald-100/80">
            {/* Breaks only between parts, so an amount never splits across lines. */}
            {worthParts.map((part, i) => (
              <Fragment key={part}>
                {i > 0 && ' · '}
                <span className="whitespace-nowrap">{part}</span>
              </Fragment>
            ))}
          </p>
        )}
        <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-white/15 pt-3">
          <div className="min-w-0">
            <dt className="text-xs text-emerald-100/80">Pemasukan bulan ini</dt>
            <dd className="truncate font-semibold">+{formatRupiah(totals.income)}</dd>
          </div>
          <div className="min-w-0">
            <dt className="text-xs text-emerald-100/80">Pengeluaran bulan ini</dt>
            <dd className="truncate font-semibold">−{formatRupiah(totals.expense)}</dd>
          </div>
        </dl>
      </section>

      {dueDebts.length > 0 && (
        <section className="mt-6" aria-labelledby="home-due">
          <div className="mx-4 mb-2 flex items-center justify-between">
            <h2 id="home-due" className="font-semibold">
              Jatuh tempo
            </h2>
            <Link to="/hutang" className={linkClass}>
              Hutang & piutang
            </Link>
          </div>
          <ul
            className={`mx-4 divide-y divide-slate-100 overflow-hidden dark:divide-slate-800 ${cardClass}`}
          >
            {dueDebts.slice(0, 3).map(({ debt, status }) => (
              <li key={debt.id}>
                <Link
                  to={`/hutang/${debt.id}`}
                  className="flex items-center gap-3 px-4 py-3 active:bg-slate-50 dark:active:bg-slate-800"
                >
                  <PersonAvatar debt={debt} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{debtTitle(debt)}</span>
                    <span className="mt-1 flex">
                      <DebtStatusPill debt={debt} status={status} today={today} />
                    </span>
                  </span>
                  <span className="shrink-0 text-sm font-semibold tabular-nums">
                    {formatRupiah(debt.remaining)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-6" aria-labelledby="home-accounts">
        <div className="mx-4 mb-2 flex items-center justify-between">
          <h2 id="home-accounts" className="font-semibold">
            Dompet
          </h2>
          <Link to="/pengaturan/dompet" className={linkClass}>
            Atur
          </Link>
        </div>
        {accounts.isError ? (
          <LoadError error={accounts.error} onRetry={() => accounts.refetch()} />
        ) : (
          <div className="flex gap-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
            {accounts.isPending
              ? [0, 1, 2].map((i) => (
                  <div key={i} className={`h-[6.5rem] w-36 shrink-0 animate-pulse ${cardClass}`} />
                ))
              : activeAccounts.map((account) => (
                  <Link
                    key={account.id}
                    to="/pengaturan/dompet"
                    className={`w-36 shrink-0 p-3 active:bg-slate-50 dark:active:bg-slate-800 ${cardClass}`}
                  >
                    <AccountBadge type={account.type} size="sm" />
                    <p className="mt-2 truncate text-sm text-slate-500 dark:text-slate-400">
                      {account.name}
                    </p>
                    <p
                      className={`truncate font-semibold tabular-nums ${account.balance < 0 ? 'text-rose-600 dark:text-rose-400' : ''}`}
                    >
                      {formatRupiah(account.balance)}
                    </p>
                  </Link>
                ))}
            {savingsTotal !== undefined && (
              <Link
                to="/tabungan"
                className={`w-36 shrink-0 p-3 active:bg-slate-50 dark:active:bg-slate-800 ${cardClass}`}
              >
                <span className="flex size-9 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300">
                  <PiggyBank className="size-4" aria-hidden />
                </span>
                <p className="mt-2 truncate text-sm text-slate-500 dark:text-slate-400">Tabungan</p>
                <p className="truncate font-semibold tabular-nums">{formatRupiah(savingsTotal)}</p>
              </Link>
            )}
          </div>
        )}
      </section>

      <section className="mt-6" aria-labelledby="home-spending">
        <div className="mx-4 mb-2 flex items-center justify-between">
          <h2 id="home-spending" className="font-semibold">
            Pengeluaran bulan ini
          </h2>
          <Link to="/laporan" className={linkClass}>
            Laporan
          </Link>
        </div>
        {listFailed ? (
          <LoadError error={listFailed.error} onRetry={() => listFailed.refetch()} />
        ) : transactions.isPending || categories.isPending ? (
          <ListSkeleton rows={2} />
        ) : (
          <div className={`mx-4 px-4 py-2 ${cardClass}`}>
            <CategoryBreakdown
              transactions={transactions.data ?? []}
              lookups={lookups}
              type="expense"
              month={month}
              limit={4}
            />
          </div>
        )}
      </section>

      <section className="mt-6" aria-labelledby="home-recent">
        <div className="mx-4 mb-2 flex items-center justify-between">
          <h2 id="home-recent" className="font-semibold">
            Transaksi terakhir
          </h2>
          <Link to="/transaksi" className={linkClass}>
            Lihat semua
          </Link>
        </div>
        {listFailed ? (
          <LoadError error={listFailed.error} onRetry={() => listFailed.refetch()} />
        ) : transactions.isPending || categories.isPending ? (
          <ListSkeleton rows={3} />
        ) : recent.length === 0 ? (
          <p
            className={`mx-4 p-5 text-center text-sm text-slate-500 dark:text-slate-400 ${cardClass}`}
          >
            Belum ada transaksi bulan ini. Tekan <span className="font-semibold">+</span> untuk
            mencatat.
          </p>
        ) : (
          <ul
            className={`mx-4 divide-y divide-slate-100 overflow-hidden dark:divide-slate-800 ${cardClass}`}
          >
            {recent.map((t) => (
              <li key={t.id}>
                <TransactionRow transaction={t} lookups={lookups} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  )
}
