import { formatCompact, formatRupiah, type MonthlyTotal } from '@finance/shared'
import { useState } from 'react'
import { formatMonth, formatShortMonth } from '../lib/format'

/** Rounds up to 1, 2, 2.5 or 5 × 10^n so the top gridline lands on a clean number. */
function niceCeil(value: number): number {
  if (value <= 0) return 1
  const magnitude = 10 ** Math.floor(Math.log10(value))
  const step = [1, 2, 2.5, 5, 10].find((s) => value <= s * magnitude) ?? 10
  return step * magnitude
}

const series = [
  { key: 'income', label: 'Pemasukan', color: 'bg-(--chart-income)' },
  { key: 'expense', label: 'Pengeluaran', color: 'bg-(--chart-expense)' },
] as const

const PLOT_HEIGHT = 150

/**
 * Income vs expense per month as paired columns on one axis. Hovering or focusing a month
 * shows its numbers in the readout; tapping it selects that month for the whole page. The
 * same numbers are always available in the table below the chart.
 */
export function MonthlyTrendChart({
  data,
  selected,
  onSelect,
}: {
  data: MonthlyTotal[]
  selected: string
  onSelect: (month: string) => void
}) {
  const [hovered, setHovered] = useState<string | null>(null)
  const top = niceCeil(Math.max(...data.flatMap((d) => [d.income, d.expense]), 0))
  const ticks = [top, top / 2, 0]
  const focus = data.find((d) => d.month === (hovered ?? selected)) ?? data.at(-1)

  return (
    <div>
      {/* Legend doubles as the readout for the month in focus. */}
      <div className="mb-3 grid grid-cols-2 gap-3">
        {series.map((s) => (
          <div key={s.key} className="min-w-0">
            <span className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
              <span className={`size-2.5 shrink-0 rounded-[3px] ${s.color}`} aria-hidden />
              {s.label}
            </span>
            <span className="mt-0.5 block truncate font-semibold">
              {focus ? formatRupiah(focus[s.key]) : '—'}
            </span>
          </div>
        ))}
      </div>
      <p className="mb-2 text-xs text-slate-500 dark:text-slate-400" aria-live="polite">
        {focus ? formatMonth(focus.month) : ''}
      </p>

      <div className="flex">
        {/* Y axis: clean compact ticks (0, half, top). */}
        <div
          className="relative w-10 shrink-0 text-[10px] text-slate-400 tabular-nums"
          style={{ height: PLOT_HEIGHT }}
          aria-hidden
        >
          {ticks.map((tick, i) => (
            <span
              key={tick}
              className="absolute right-1.5 -translate-y-1/2 leading-none"
              style={{ top: `${(i / (ticks.length - 1)) * 100}%` }}
            >
              {formatCompact(tick)}
            </span>
          ))}
        </div>

        <div className="min-w-0 flex-1">
          <div className="relative" style={{ height: PLOT_HEIGHT }}>
            {/* Hairline gridlines; the bottom one is the baseline. */}
            {ticks.map((tick, i) => (
              <span
                key={tick}
                className="absolute inset-x-0 h-px bg-(--chart-grid)"
                style={{ top: `${(i / (ticks.length - 1)) * 100}%` }}
                aria-hidden
              />
            ))}
            <div className="absolute inset-0 flex">
              {data.map((d) => {
                const isSelected = d.month === selected
                return (
                  <button
                    key={d.month}
                    type="button"
                    onClick={() => onSelect(d.month)}
                    onPointerEnter={() => setHovered(d.month)}
                    onPointerLeave={() => setHovered(null)}
                    onFocus={() => setHovered(d.month)}
                    onBlur={() => setHovered(null)}
                    aria-pressed={isSelected}
                    aria-label={`${formatMonth(d.month)}: pemasukan ${formatRupiah(d.income)}, pengeluaran ${formatRupiah(d.expense)}`}
                    className={`flex flex-1 items-end justify-center gap-0.5 rounded-t-lg outline-offset-2 ${
                      isSelected ? 'bg-slate-100 dark:bg-slate-800/70' : ''
                    } ${hovered === d.month && !isSelected ? 'bg-slate-50 dark:bg-slate-800/40' : ''}`}
                  >
                    {series.map((s) => (
                      <span
                        key={s.key}
                        className={`w-2.5 rounded-t-[4px] ${s.color}`}
                        style={{ height: `${(d[s.key] / top) * 100}%` }}
                      />
                    ))}
                  </button>
                )
              })}
            </div>
          </div>
          <div className="mt-1.5 flex" aria-hidden>
            {data.map((d) => (
              <span
                key={d.month}
                className={`flex-1 text-center text-xs ${
                  d.month === selected
                    ? 'font-semibold text-slate-900 dark:text-white'
                    : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                {formatShortMonth(d.month)}
              </span>
            ))}
          </div>
        </div>
      </div>

      <details className="mt-4 text-sm">
        <summary className="cursor-pointer text-emerald-600 dark:text-emerald-400">
          Lihat tabel
        </summary>
        <table className="mt-2 w-full text-left tabular-nums">
          <thead className="text-xs text-slate-500 dark:text-slate-400">
            <tr>
              <th className="py-1 font-medium">Bulan</th>
              <th className="py-1 text-right font-medium">Pemasukan</th>
              <th className="py-1 text-right font-medium">Pengeluaran</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {data.map((d) => (
              <tr key={d.month}>
                <td className="py-1.5">{formatMonth(d.month)}</td>
                <td className="py-1.5 text-right">{formatRupiah(d.income)}</td>
                <td className="py-1.5 text-right">{formatRupiah(d.expense)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  )
}
