import { shiftMonth } from '@finance/shared'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { formatMonth } from '../lib/format'
import { cardClass } from './ui'

const arrowClass =
  'rounded-xl p-2.5 text-slate-600 active:bg-slate-100 dark:text-slate-300 dark:active:bg-slate-800'

export function MonthSwitcher({
  month,
  onChange,
}: {
  month: string
  onChange: (month: string) => void
}) {
  return (
    <div className={`mx-4 flex items-center justify-between p-1.5 ${cardClass}`}>
      <button
        type="button"
        aria-label="Bulan sebelumnya"
        onClick={() => onChange(shiftMonth(month, -1))}
        className={arrowClass}
      >
        <ChevronLeft className="size-5" aria-hidden />
      </button>
      <h2 className="font-semibold" aria-live="polite">
        {formatMonth(month)}
      </h2>
      <button
        type="button"
        aria-label="Bulan berikutnya"
        onClick={() => onChange(shiftMonth(month, 1))}
        className={arrowClass}
      >
        <ChevronRight className="size-5" aria-hidden />
      </button>
    </div>
  )
}
