import {
  formatRupiah,
  matchesFilters,
  SEARCH_LIMIT,
  summarize,
  TRANSACTION_TYPES,
  type Transaction,
  type TransactionFilters,
  type TransactionType,
} from '@finance/shared'
import { ChevronRight, ReceiptText, Search, SlidersHorizontal, X } from 'lucide-react'
import { useEffect, useEffectEvent, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { FilterSheet } from '../components/FilterSheet'
import { MonthSwitcher } from '../components/MonthSwitcher'
import { PageHeader } from '../components/PageHeader'
import { ListSkeleton, LoadError } from '../components/QueryState'
import { type Lookups, TransactionRow, useLookups } from '../components/TransactionRow'
import { cardClass, inputClass, primaryButtonClass, secondaryButtonClass } from '../components/ui'
import { formatDayHeading, formatMonth, formatSignedRupiah } from '../lib/format'
import { useMonthParam } from '../lib/navigation'
import {
  useAccounts,
  useCategories,
  useMonthTransactions,
  useSavingsGoals,
  useTransactionSearch,
} from '../lib/queries'
import { transactionTypes } from '../lib/visuals'

/** Filters and the search term live in the URL (?jenis, ?kategori, ?dompet, ?q). */
function useListParams() {
  const [params, setParams] = useSearchParams()
  const type = params.get('jenis') as TransactionType | null
  const filters: TransactionFilters = {
    type: type && TRANSACTION_TYPES.includes(type) ? type : undefined,
    categoryId: params.get('kategori') || undefined,
    accountId: params.get('dompet') || undefined,
  }
  const names = { type: 'jenis', categoryId: 'kategori', accountId: 'dompet', q: 'q' } as const

  const update = (patch: Partial<TransactionFilters & { q: string }>) =>
    setParams(
      (previous) => {
        const next = new URLSearchParams(previous)
        for (const [key, value] of Object.entries(patch)) {
          const name = names[key as keyof typeof names]
          if (value) next.set(name, value)
          else next.delete(name)
        }
        return next
      },
      { replace: true },
    )

  return { filters, q: params.get('q') ?? '', update }
}

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

export function TransactionsPage() {
  const [month, setMonth] = useMonthParam()
  const { filters, q, update } = useListParams()
  const [text, setText] = useState(q)
  const [filtersOpen, setFiltersOpen] = useState(false)

  // Search as you type, without a request per keystroke. The timer restarts only when the
  // text changes; the effect event always sees the latest URL state.
  const commitSearch = useEffectEvent((value: string) => {
    if (value !== q) update({ q: value })
  })
  useEffect(() => {
    const timer = setTimeout(() => commitSearch(text.trim()), 300)
    return () => clearTimeout(timer)
  }, [text])

  const searching = q.length > 0
  const monthList = useMonthTransactions(month)
  const search = useTransactionSearch(q, filters)
  const accounts = useAccounts()
  const categories = useCategories()
  const goals = useSavingsGoals()
  const lookups = useLookups(accounts.data, categories.data, goals.data)

  const source = searching ? search : monthList
  const list = searching ? search.data : monthList.data?.filter((t) => matchesFilters(t, filters))
  const ready = list && accounts.data && categories.data
  const failed = [source, accounts, categories].find((query) => query.isError)
  const totals = summarize(list ?? [])

  const chips = [
    filters.type && { key: 'type', label: transactionTypes[filters.type].label },
    filters.categoryId && {
      key: 'categoryId',
      label: lookups.categories.get(filters.categoryId)?.name ?? 'Kategori',
    },
    filters.accountId && {
      key: 'accountId',
      label: lookups.accounts.get(filters.accountId)?.name ?? 'Dompet',
    },
  ].filter((chip): chip is { key: keyof TransactionFilters; label: string } => Boolean(chip))
  const clearFilters = () =>
    update({ type: undefined, categoryId: undefined, accountId: undefined })

  return (
    <>
      <PageHeader title="Transaksi" />

      <div className="mx-4 flex gap-2">
        <div className="relative min-w-0 flex-1">
          <Search
            className="pointer-events-none absolute top-1/2 left-3.5 size-5 -translate-y-1/2 text-slate-400"
            aria-hidden
          />
          <input
            type="search"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Cari catatan atau kategori"
            aria-label="Cari transaksi di semua bulan"
            maxLength={100}
            className={`${inputClass} pr-10 pl-11 [&::-webkit-search-cancel-button]:hidden`}
          />
          {text && (
            <button
              type="button"
              aria-label="Hapus pencarian"
              onClick={() => {
                setText('')
                update({ q: '' })
              }}
              className="absolute top-1/2 right-2 -translate-y-1/2 rounded-full p-1.5 text-slate-400 active:bg-slate-100 dark:active:bg-slate-800"
            >
              <X className="size-4" aria-hidden />
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={() => setFiltersOpen(true)}
          aria-label={chips.length ? `Filter (${chips.length} aktif)` : 'Filter'}
          className="relative flex size-12 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 active:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
        >
          <SlidersHorizontal className="size-5" aria-hidden />
          {chips.length > 0 && (
            <span className="absolute -top-1.5 -right-1.5 flex size-5 items-center justify-center rounded-full bg-emerald-600 text-[11px] font-semibold text-white">
              {chips.length}
            </span>
          )}
        </button>
      </div>

      {chips.length > 0 && (
        <div className="mx-4 mt-2 flex flex-wrap gap-2">
          {chips.map((chip) => (
            <button
              key={chip.key}
              type="button"
              onClick={() => update({ [chip.key]: undefined })}
              aria-label={`Hapus filter ${chip.label}`}
              className="flex h-8 items-center gap-1.5 rounded-full bg-emerald-50 pr-2.5 pl-3 text-xs font-medium text-emerald-800 active:bg-emerald-100 dark:bg-emerald-950 dark:text-emerald-300"
            >
              {chip.label}
              <X className="size-3.5" aria-hidden />
            </button>
          ))}
        </div>
      )}

      {!searching && (
        <div className="mt-3">
          <MonthSwitcher month={month} onChange={setMonth} />
        </div>
      )}

      {ready && (
        <section className={`mx-4 mt-3 p-4 ${cardClass}`} aria-label="Ringkasan">
          {searching && (
            <p className="mb-3 text-sm text-slate-600 dark:text-slate-300">
              {list.length === SEARCH_LIMIT
                ? `${SEARCH_LIMIT} hasil terbaru untuk “${q}”`
                : `${list.length} hasil untuk “${q}” di semua bulan`}
            </p>
          )}
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
            <span className="font-semibold tabular-nums">{formatSignedRupiah(totals.net)}</span>
          </div>
          {!searching && (
            <Link
              to={`/laporan?bulan=${month}`}
              className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3 text-sm font-medium text-emerald-600 dark:border-slate-800 dark:text-emerald-400"
            >
              Lihat laporan {formatMonth(month)}
              <ChevronRight className="size-4" aria-hidden />
            </Link>
          )}
        </section>
      )}

      <div className={`mt-5 transition-opacity ${source.isPlaceholderData ? 'opacity-60' : ''}`}>
        {failed ? (
          <LoadError error={failed.error} onRetry={() => failed.refetch()} />
        ) : !ready ? (
          <ListSkeleton />
        ) : list.length > 0 ? (
          <TransactionGroups list={list} lookups={lookups} />
        ) : searching || chips.length > 0 ? (
          <div className={`mx-4 px-6 py-10 text-center ${cardClass}`}>
            <p className="font-medium">
              {searching ? `Tidak ada hasil untuk “${q}”` : 'Tidak ada transaksi yang cocok'}
            </p>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {searching
                ? 'Coba kata lain, atau hapus filter yang aktif.'
                : `Tidak ada transaksi di ${formatMonth(month)} dengan filter ini.`}
            </p>
            {chips.length > 0 && (
              <button
                type="button"
                onClick={clearFilters}
                className={`${secondaryButtonClass} mx-auto mt-5 w-auto px-6`}
              >
                Hapus filter
              </button>
            )}
          </div>
        ) : (
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
        )}
      </div>

      {accounts.data && categories.data && (
        <FilterSheet
          open={filtersOpen}
          onClose={() => setFiltersOpen(false)}
          filters={filters}
          onChange={update}
          onReset={clearFilters}
          accounts={accounts.data}
          categories={categories.data}
        />
      )}
    </>
  )
}

function TransactionGroups({ list, lookups }: { list: Transaction[]; lookups: Lookups }) {
  return (
    <div className="space-y-5">
      {groupByDay(list).map((group) => {
        const day = summarize(group.items)
        return (
          <section key={group.date}>
            <div className="mx-4 mb-1.5 flex items-baseline justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
              <h3>{formatDayHeading(group.date)}</h3>
              {/* Transfers only move money between wallets: no day total for those. */}
              {(day.income > 0 || day.expense > 0) && (
                <span className="tabular-nums">{formatSignedRupiah(day.net)}</span>
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
  )
}
