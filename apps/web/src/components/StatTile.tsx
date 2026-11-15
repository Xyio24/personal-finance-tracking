import { TrendingDown, TrendingUp } from 'lucide-react'
import { formatShare } from '../lib/format'
import { cardClass } from './ui'

export type Delta = {
  /** Change relative to the comparison value, e.g. -0.12 for 12% lower. */
  change: number
  /** Whether a rise is good news (income) or bad news (expenses). */
  upIsGood: boolean
  /** What it is compared with, e.g. "1–15 Okt". */
  versus: string
}

/** Label, value and an optional change. The change carries an arrow and words, never color alone. */
export function StatTile({ label, value, delta }: { label: string; value: string; delta?: Delta }) {
  return (
    <div className={`min-w-0 p-4 ${cardClass}`}>
      <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-1 truncate text-lg font-semibold">{value}</p>
      {delta && <DeltaLine delta={delta} />}
    </div>
  )
}

function DeltaLine({ delta }: { delta: Delta }) {
  if (delta.change === 0) {
    return (
      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Sama dengan {delta.versus}</p>
    )
  }
  const up = delta.change > 0
  const good = up === delta.upIsGood
  const Icon = up ? TrendingUp : TrendingDown
  return (
    <p
      className={`mt-1 flex items-center gap-1 text-xs ${
        good ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'
      }`}
    >
      <Icon className="size-3.5 shrink-0" aria-hidden />
      <span className="truncate">
        {formatShare(Math.abs(delta.change))} {up ? 'lebih tinggi' : 'lebih rendah'} dari{' '}
        {delta.versus}
      </span>
    </p>
  )
}
