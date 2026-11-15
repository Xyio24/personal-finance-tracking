import { type Debt, type DebtStatus, daysBetween } from '@finance/shared'
import { CalendarX, CircleCheck, Clock, HeartHandshake, type LucideIcon } from 'lucide-react'

/** "Hutang ke Kakak" / "Piutang dari Budi" */
export const debtTitle = (debt: Pick<Debt, 'direction' | 'person'>) =>
  debt.direction === 'payable' ? `Hutang ke ${debt.person}` : `Piutang dari ${debt.person}`

/** What a write-off is called for this side. */
export const writeOffLabel = (debt: Pick<Debt, 'direction'>) =>
  debt.direction === 'receivable' ? 'Ikhlaskan' : 'Dianggap lunas'

/** Initial of the person in a circle; color tells hutang (rose) from piutang (sky). */
export function PersonAvatar({
  debt,
  size = 'md',
}: {
  debt: Pick<Debt, 'direction' | 'person'>
  size?: 'md' | 'lg'
}) {
  const tone =
    debt.direction === 'payable'
      ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300'
      : 'bg-sky-100 text-sky-700 dark:bg-sky-900/50 dark:text-sky-300'
  return (
    <span
      aria-hidden
      className={`flex shrink-0 items-center justify-center rounded-full font-semibold ${tone} ${
        size === 'lg' ? 'size-14 text-xl' : 'size-11'
      }`}
    >
      {debt.person.trim().charAt(0).toUpperCase()}
    </span>
  )
}

/** Due-date and closing state as an icon plus words, never color alone. */
export function DebtStatusPill({
  debt,
  status,
  today,
}: {
  debt: Pick<Debt, 'direction' | 'dueDate'>
  status: DebtStatus
  today: string
}) {
  if (status === 'open') return null
  let label: string
  let Icon: LucideIcon
  let className: string
  if (status === 'overdue') {
    label = 'Lewat jatuh tempo'
    Icon = CalendarX
    className = 'bg-rose-100 text-rose-800 dark:bg-rose-900/50 dark:text-rose-300'
  } else if (status === 'due_soon') {
    const days = debt.dueDate ? daysBetween(today, debt.dueDate) : 0
    label = days === 0 ? 'Jatuh tempo hari ini' : `Jatuh tempo ${days} hari lagi`
    Icon = Clock
    className = 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300'
  } else if (status === 'settled') {
    label = 'Lunas'
    Icon = CircleCheck
    className = 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300'
  } else {
    label = debt.direction === 'receivable' ? 'Diikhlaskan' : 'Dianggap lunas'
    Icon = HeartHandshake
    className = 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
  }
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${className}`}
    >
      <Icon className="size-3.5" aria-hidden />
      {label}
    </span>
  )
}
