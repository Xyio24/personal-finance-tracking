import { formatRupiah, type GoalProgress, type GoalStatus, type SavingsGoal } from '@finance/shared'
import {
  CalendarX,
  CircleAlert,
  CircleCheck,
  type LucideIcon,
  PartyPopper,
  Sparkles,
  TriangleAlert,
} from 'lucide-react'
import { formatDate } from '../lib/format'

const statusStyles: Record<
  Exclude<GoalStatus, 'open'>,
  { label: string; icon: LucideIcon; className: string }
> = {
  achieved: {
    label: 'Tercapai 🎉',
    icon: PartyPopper,
    className: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300',
  },
  on_track: {
    label: 'Sesuai jalur',
    icon: CircleCheck,
    className: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300',
  },
  tight: {
    label: 'Mepet',
    icon: TriangleAlert,
    className: 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300',
  },
  behind: {
    label: 'Perlu dikejar',
    icon: CircleAlert,
    className: 'bg-rose-100 text-rose-800 dark:bg-rose-900/50 dark:text-rose-300',
  },
  overdue: {
    label: 'Lewat deadline',
    icon: CalendarX,
    className: 'bg-rose-100 text-rose-800 dark:bg-rose-900/50 dark:text-rose-300',
  },
  new: {
    label: 'Baru dimulai',
    icon: Sparkles,
    className: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  },
}

/** Status as an icon plus words, never color alone. Open-ended goals show no pill. */
export function GoalStatusPill({ status }: { status: GoalStatus }) {
  if (status === 'open') return null
  const { label, icon: Icon, className } = statusStyles[status]
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${className}`}
    >
      <Icon className="size-3.5" aria-hidden />
      {label}
    </span>
  )
}

/** Meter: the filled part on a lighter track of the same hue. */
export function GoalProgressBar({ ratio, label }: { ratio: number; label: string }) {
  const percent = Math.round(ratio * 100)
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percent}
      className="h-2 overflow-hidden rounded-full bg-emerald-100 dark:bg-emerald-950"
    >
      <div
        className="h-full rounded-full bg-emerald-500 transition-[width]"
        style={{ width: `${Math.max(percent, ratio > 0 ? 2 : 0)}%` }}
      />
    </div>
  )
}

/** One line under a goal: what the target asks for, in plain words. */
export function goalSummary(goal: SavingsGoal, progress: GoalProgress): string {
  if (!goal.targetAmount) return 'Tanpa target'
  if (progress.status === 'achieved') return `Target ${formatRupiah(goal.targetAmount)} tercapai`
  if (!goal.deadline) return `Kurang ${formatRupiah(progress.remaining ?? 0)}`
  if (progress.status === 'overdue') {
    return `Deadline ${formatDate(goal.deadline)} lewat · kurang ${formatRupiah(progress.remaining ?? 0)}`
  }
  return `${formatRupiah(progress.monthlyNeeded ?? 0)}/bulan sampai ${formatDate(goal.deadline)}`
}
