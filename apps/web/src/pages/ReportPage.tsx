import {
  type CategoryType,
  daysInMonth,
  formatRupiah,
  shiftMonth,
  summarize,
} from '@finance/shared'
import { useState } from 'react'
import { CategoryBreakdown } from '../components/CategoryBreakdown'
import { MonthlyTrendChart } from '../components/MonthlyTrendChart'
import { MonthSwitcher } from '../components/MonthSwitcher'
import { ListSkeleton, LoadError } from '../components/QueryState'
import { SegmentedControl } from '../components/SegmentedControl'
import { type Delta, StatTile } from '../components/StatTile'
import { SubPageHeader } from '../components/SubPageHeader'
import { useLookups } from '../components/TransactionRow'
import { cardClass } from '../components/ui'
import { formatMonth, formatShortMonth, formatSignedRupiah } from '../lib/format'
import { useMonthParam } from '../lib/navigation'
import { useCategories, useMonthlyReport, useMonthTransactions } from '../lib/queries'

const sideOptions = [
  { value: 'expense', label: 'Pengeluaran' },
  { value: 'income', label: 'Pemasukan' },
] as const

const TREND_MONTHS = 6

export function ReportPage() {
  const [month, setMonth, currentMonth] = useMonthParam()
  const [side, setSide] = useState<CategoryType>('expense')

  // The trend window stays on the latest six months while browsing inside them, and only
  // moves when a month outside that window is chosen.
  const latestWindowStart = shiftMonth(currentMonth, -(TREND_MONTHS - 1))
  const windowEnd = month > currentMonth || month < latestWindowStart ? month : currentMonth
  const report = useMonthlyReport(shiftMonth(windowEnd, -(TREND_MONTHS - 1)), windowEnd)

  const previousMonth = shiftMonth(month, -1)
  const transactions = useMonthTransactions(month)
  const previous = useMonthTransactions(previousMonth)
  const categories = useCategories()
  const lookups = useLookups(undefined, categories.data)

  const totals = summarize(transactions.data ?? [])
  const today = new Date()
  const isCurrent = month === currentMonth

  // Compare like with like: a running month is compared with the same days of last month.
  const cutoffDay = isCurrent ? today.getDate() : 31
  const previousTotals =
    previous.data && !previous.isPlaceholderData
      ? summarize(previous.data.filter((t) => Number(t.date.slice(8, 10)) <= cutoffDay))
      : undefined
  const versus = isCurrent
    ? `1–${cutoffDay} ${formatShortMonth(previousMonth)}`
    : formatMonth(previousMonth)
  const delta = (now: number, before: number | undefined, upIsGood: boolean): Delta | undefined =>
    before ? { change: (now - before) / before, upIsGood, versus } : undefined

  const daysSoFar = month > currentMonth ? 0 : isCurrent ? today.getDate() : daysInMonth(month)
  const failed = [transactions, categories].find((q) => q.isError)

  return (
    <>
      <SubPageHeader title="Laporan" backTo="/" />
      <MonthSwitcher month={month} onChange={setMonth} />

      {failed ? (
        <div className="mt-4">
          <LoadError error={failed.error} onRetry={() => failed.refetch()} />
        </div>
      ) : !transactions.data || !categories.data ? (
        <div className="mt-4">
          <ListSkeleton rows={4} />
        </div>
      ) : (
        <div className={`transition-opacity ${transactions.isPlaceholderData ? 'opacity-60' : ''}`}>
          <section className="mx-4 mt-3 grid grid-cols-2 gap-3" aria-label="Ringkasan bulan">
            <StatTile
              label="Pemasukan"
              value={formatRupiah(totals.income)}
              delta={delta(totals.income, previousTotals?.income, true)}
            />
            <StatTile
              label="Pengeluaran"
              value={formatRupiah(totals.expense)}
              delta={delta(totals.expense, previousTotals?.expense, false)}
            />
            <StatTile label="Selisih" value={formatSignedRupiah(totals.net)} />
            <StatTile
              label="Pengeluaran per hari"
              value={daysSoFar ? formatRupiah(Math.round(totals.expense / daysSoFar)) : '—'}
            />
          </section>

          <section className={`mx-4 mt-4 p-4 ${cardClass}`} aria-labelledby="trend-title">
            <h2 id="trend-title" className="mb-3 font-semibold">
              Tren {TREND_MONTHS} bulan
            </h2>
            {report.data ? (
              <div className={report.isPlaceholderData ? 'opacity-60' : ''}>
                <MonthlyTrendChart data={report.data} selected={month} onSelect={setMonth} />
              </div>
            ) : report.isError ? (
              <LoadError error={report.error} onRetry={() => report.refetch()} />
            ) : (
              <div className="h-64 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />
            )}
          </section>

          <section className={`mx-4 mt-4 p-4 ${cardClass}`} aria-labelledby="category-title">
            <h2 id="category-title" className="mb-3 font-semibold">
              Per kategori
            </h2>
            <SegmentedControl
              label="Jenis kategori"
              value={side}
              options={sideOptions}
              onChange={setSide}
            />
            <div className="mt-3">
              <CategoryBreakdown
                transactions={transactions.data}
                lookups={lookups}
                type={side}
                month={month}
              />
            </div>
          </section>
        </div>
      )}
    </>
  )
}
