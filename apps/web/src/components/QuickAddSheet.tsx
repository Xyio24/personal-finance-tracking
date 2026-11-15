import type { TransactionType } from '@finance/shared'
import { ArrowLeftRight, type LucideIcon, TrendingDown, TrendingUp } from 'lucide-react'
import { useNavigate } from 'react-router'
import { Sheet } from './Sheet'

const options: { type: TransactionType; label: string; icon: LucideIcon; tone: string }[] = [
  {
    type: 'expense',
    label: 'Pengeluaran',
    icon: TrendingDown,
    tone: 'bg-rose-50 text-rose-600 dark:bg-rose-950 dark:text-rose-400',
  },
  {
    type: 'income',
    label: 'Pemasukan',
    icon: TrendingUp,
    tone: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400',
  },
  {
    type: 'transfer',
    label: 'Transfer',
    icon: ArrowLeftRight,
    tone: 'bg-sky-50 text-sky-600 dark:bg-sky-950 dark:text-sky-400',
  },
]

/** Opened by the center "+" button: pick what to record, then the form opens. */
export function QuickAddSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate()

  return (
    <Sheet open={open} onClose={onClose} title="Catat cepat">
      <div className="grid grid-cols-3 gap-3">
        {options.map(({ type, label, icon: Icon, tone }) => (
          <button
            key={type}
            type="button"
            onClick={() => {
              onClose()
              navigate(`/transaksi/baru?type=${type}`)
            }}
            className="flex flex-col items-center gap-2 rounded-2xl border border-slate-200 p-4 text-sm font-medium active:bg-slate-50 dark:border-slate-800 dark:active:bg-slate-800"
          >
            <span className={`flex size-11 items-center justify-center rounded-xl ${tone}`}>
              <Icon className="size-6" aria-hidden />
            </span>
            {label}
          </button>
        ))}
      </div>
    </Sheet>
  )
}
